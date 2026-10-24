import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logError } from '../_shared/logger.ts'

// Recomendaciones con Gemini para administradores/encargados:
//   - modo 'operador': operador sugerido para una solicitud enviada.
//   - modo 'ruta': solicitudes sugeridas para una ruta en edición.
// La clave vive solo aquí (secreto GEMINI_API_KEY), nunca en el frontend. Los datos se consultan
// con el JWT del llamador (RLS) y a Gemini solo se le envía lo necesario para decidir: zona,
// coordenadas, tipo, prioridad, plazo y carga — sin nombres de clientes ni datos de contacto.
// La respuesta se valida: solo se devuelven identificadores que estaban entre los candidatos.
// El frontend tiene una alternativa por reglas (src/features/recomendaciones/lib) para cuando
// esta función no está configurada o falla.

interface Peticion {
  modo: 'operador' | 'ruta'
  solicitud_id?: string
  fecha?: string
  /** Último día de una ruta de varios días. */
  fecha_fin?: string | null
  seleccionadas?: string[]
  responsable_id?: string | null
  participantes?: string[]
}

interface Ubicacion {
  provincia: string
  canton: string
  distrito: string
  latitud: number | null
  longitud: number | null
}

const ESTADOS_ACTIVOS = ['asignada', 'en_atencion', 'en_espera_materiales']

/**
 * Error con un mensaje apto para el usuario final (`message`) y el detalle técnico aparte, que
 * solo va al log: el usuario no necesita ver códigos ni respuestas crudas de Google.
 */
class ErrorIa extends Error {
  constructor(
    mensaje: string,
    readonly status: number,
    readonly detalle?: string,
  ) {
    super(mensaje)
  }
}

function errorDeGemini(status: number, detalle: string) {
  const mensaje =
    status === 429 || status >= 500
      ? 'El servicio de IA está muy solicitado en este momento. Intente de nuevo en unos minutos.'
      : status === 401 || status === 403
        ? 'El servicio de IA no aceptó la clave configurada. Un administrador debe revisarla.'
        : status === 404
          ? 'El modelo de IA configurado ya no está disponible. Un administrador debe actualizarlo.'
          : 'El servicio de IA no respondió correctamente. Intente de nuevo más tarde.'
  return new ErrorIa(mensaje, 503, `Gemini ${status}: ${detalle.slice(0, 500)}`)
}

async function preguntarGemini(
  prompt: string,
  maximo: number,
  campoId: string,
  tiempoEsperaMs: number,
) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey)
    throw new ErrorIa(
      'Las recomendaciones con IA no están configuradas. Un administrador debe configurarlas.',
      503,
      'Falta el secreto GEMINI_API_KEY.',
    )
  const modelo = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash'
  // Mismo plazo que el navegador (Configuración → General): no se deja la llamada colgada.
  const senal = AbortSignal.timeout(tiempoEsperaMs)
  const agotado = () =>
    new ErrorIa(
      `La recomendación con IA tardó más de ${Math.round(tiempoEsperaMs / 1000)} s y se canceló.`,
      504,
      `Tiempo de espera agotado (${tiempoEsperaMs} ms) en ${modelo}.`,
    )
  let respuesta: Response
  try {
    respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: 'POST',
        signal: senal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              maxItems: maximo,
              items: {
                type: 'OBJECT',
                properties: { [campoId]: { type: 'STRING' }, motivo: { type: 'STRING' } },
                required: [campoId, 'motivo'],
              },
            },
          },
        }),
      },
    )
  } catch (error) {
    if (senal.aborted) throw agotado()
    throw error
  }
  if (!respuesta.ok) throw errorDeGemini(respuesta.status, await respuesta.text())
  let cuerpo: { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  try {
    cuerpo = await respuesta.json()
  } catch (error) {
    if (senal.aborted) throw agotado()
    throw error
  }
  const texto = cuerpo?.candidates?.[0]?.content?.parts?.[0]?.text
  try {
    if (typeof texto !== 'string') throw new Error('sin texto')
    return JSON.parse(texto) as Record<string, string>[]
  } catch {
    throw new ErrorIa(
      'La IA no devolvió una recomendación válida. Intente de nuevo.',
      503,
      `Respuesta inesperada de Gemini: ${JSON.stringify(cuerpo).slice(0, 500)}`,
    )
  }
}

function zona(ubicacion: Ubicacion | null) {
  if (!ubicacion) return null
  return {
    provincia: ubicacion.provincia,
    canton: ubicacion.canton,
    distrito: ubicacion.distrito,
    lat: ubicacion.latitud,
    lng: ubicacion.longitud,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const correlacionId = crypto.randomUUID()
  function respuesta(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify({ ...body, correlacion_id: correlacionId }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (request.method !== 'POST') return respuesta({ error: 'Método no permitido.' }, 405)

  try {
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    })
    const { data: esGestor, error: rolError } = await caller.rpc('es_gestor')
    if (rolError || !esGestor) return respuesta({ error: 'Acceso denegado.' }, 403)

    // Configuración → General: el administrador puede apagar las recomendaciones con IA.
    const { data: configuracion } = await caller
      .from('configuracion_operativa')
      .select('ia_recomendaciones_activa, ia_tiempo_espera_segundos')
      .eq('id', true)
      .maybeSingle()
    if (configuracion && !configuracion.ia_recomendaciones_activa)
      return respuesta(
        {
          error: 'Las recomendaciones con IA están deshabilitadas en Configuración → General.',
          codigo: 'ia_deshabilitada',
        },
        409,
      )

    const tiempoEsperaMs = (configuracion?.ia_tiempo_espera_segundos ?? 6) * 1000

    const payload = (await request.json()) as Peticion

    if (payload.modo === 'operador') {
      if (!payload.solicitud_id) return respuesta({ error: 'La solicitud es requerida.' }, 400)
      const { data: solicitud, error } = await caller
        .from('solicitudes')
        .select(
          'id, numero, prioridad, tipo_solicitud_id, tipo:tipos_solicitud(nombre), ubicacion:ubicaciones(provincia, canton, distrito, latitud, longitud)',
        )
        .eq('id', payload.solicitud_id)
        .single()
      if (error) throw error
      const { data: operadores, error: operadoresError } = await caller
        .from('usuarios')
        .select(
          'id, nombre_completo, usuario_roles!usuario_roles_usuario_id_fkey!inner(roles!inner(codigo))',
        )
        .eq('activo', true)
        .eq('usuario_roles.roles.codigo', 'operador')
      if (operadoresError) throw operadoresError
      if (!operadores?.length) return respuesta({ recomendaciones: [] })
      const { data: historial, error: historialError } = await caller
        .from('solicitudes')
        .select(
          'operador_id, estado, tipo_solicitud_id, ubicacion:ubicaciones(provincia, canton, distrito)',
        )
        .in(
          'operador_id',
          operadores.map((item) => item.id),
        )
        .order('creado_en', { ascending: false })
        .limit(2000)
      if (historialError) throw historialError

      const ubicacion = solicitud.ubicacion as unknown as Ubicacion | null
      const resumen = operadores.map((operador) => {
        const propias = (historial ?? []).filter((item) => item.operador_id === operador.id)
        const activas = propias.filter((item) => ESTADOS_ACTIVOS.includes(item.estado))
        const zonaDe = (item: (typeof propias)[number]) =>
          item.ubicacion as unknown as Omit<Ubicacion, 'latitud' | 'longitud'> | null
        return {
          operador_id: operador.id,
          nombre: operador.nombre_completo,
          carga_activa: activas.length,
          atendidas_mismo_tipo: propias.filter(
            (item) =>
              item.tipo_solicitud_id === solicitud.tipo_solicitud_id &&
              ['atendida', 'cerrada'].includes(item.estado),
          ).length,
          activas_mismo_distrito: activas.filter(
            (item) => ubicacion && zonaDe(item)?.distrito === ubicacion.distrito,
          ).length,
          activas_mismo_canton: activas.filter(
            (item) => ubicacion && zonaDe(item)?.canton === ubicacion.canton,
          ).length,
        }
      })
      const prompt = `Eres el coordinador de un servicio técnico de campo en Costa Rica.
Recomienda hasta 3 operadores para atender esta solicitud, del más al menos adecuado.
Equilibra: menor carga activa, experiencia en el mismo tipo de servicio y cercanía (ya trabaja en
el mismo distrito o cantón, lo que reduce traslados). Una solicitud urgente o alta pesa más la
disponibilidad. Responde en español; "motivo" en una frase corta y concreta.
Solicitud: ${JSON.stringify({
        tipo: (solicitud.tipo as unknown as { nombre: string } | null)?.nombre,
        prioridad: solicitud.prioridad,
        zona: zona(ubicacion),
      })}
Operadores: ${JSON.stringify(resumen)}`
      const sugeridos = await preguntarGemini(prompt, 3, 'operador_id', tiempoEsperaMs)
      const validos = new Map(resumen.map((item) => [item.operador_id, item.nombre]))
      return respuesta({
        recomendaciones: sugeridos
          .filter((item) => validos.has(item.operador_id))
          .map((item) => ({
            operador_id: item.operador_id,
            nombre: validos.get(item.operador_id),
            motivo: item.motivo,
          })),
      })
    }

    if (payload.modo === 'ruta') {
      const seleccionadas = payload.seleccionadas ?? []
      const personas = new Set(
        [payload.responsable_id, ...(payload.participantes ?? [])].filter(Boolean),
      )
      const inicio = payload.fecha ?? new Date().toISOString().slice(0, 10)
      const fin = payload.fecha_fin && payload.fecha_fin >= inicio ? payload.fecha_fin : inicio
      const { data: candidatas, error } = await caller
        .from('solicitudes')
        .select(
          'id, numero, prioridad, sla_vence_en, operador_id, cliente_id, tipo:tipos_solicitud(nombre), ubicacion:ubicaciones(provincia, canton, distrito, latitud, longitud), en_ruta:ruta_solicitudes(ruta_id), programacion:programacion_solicitudes(fecha_programada)',
        )
        .in('estado', ESTADOS_ACTIVOS)
        .order('creado_en', { ascending: false })
        .limit(200)
      if (error) throw error
      // Relaciones uno-a-uno: PostgREST puede devolver objeto o arreglo.
      const uno = (valor: unknown) => (Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null))
      const elegidas = (candidatas ?? []).filter((item) => seleccionadas.includes(item.id))
      const disponibles = (candidatas ?? [])
        .filter((item) => !seleccionadas.includes(item.id) && !uno(item.en_ruta))
        .slice(0, 60)
      if (!disponibles.length) return respuesta({ recomendaciones: [] })
      // Seudónimos estables por consulta: Gemini puede detectar "mismo cliente" o "mismo operador"
      // sin recibir los identificadores reales.
      const alias = (prefijo: string) => {
        const mapa = new Map<string, string>()
        return (id: string | null) => {
          if (!id) return null
          if (!mapa.has(id)) mapa.set(id, `${prefijo}${mapa.size + 1}`)
          return mapa.get(id)
        }
      }
      const cliente = alias('C')
      const operador = alias('O')
      const describir = (item: (typeof candidatas)[number]) => ({
        solicitud_id: item.id,
        numero: item.numero,
        tipo: (item.tipo as unknown as { nombre: string } | null)?.nombre,
        prioridad: item.prioridad,
        vence: item.sla_vence_en,
        programada_para:
          (uno(item.programacion) as { fecha_programada: string } | null)?.fecha_programada ?? null,
        cliente: cliente(item.cliente_id),
        operador: operador(item.operador_id),
        operador_es_persona_de_la_ruta: item.operador_id ? personas.has(item.operador_id) : false,
        zona: zona(item.ubicacion as unknown as Ubicacion | null),
      })
      const variosDias = fin !== inicio
      const prompt = `Eres el planificador de rutas de un servicio técnico de campo en Costa Rica.
La ruta ${variosDias ? `dura varios días: del ${inicio} al ${fin}` : `es para el ${inicio}`}.
Recomienda hasta 8 solicitudes disponibles para agregarle, de la más a la menos conveniente.
Criterios, en este orden de peso:
1. Cercanía geográfica a las ya incluidas (mismo distrito o cantón, o coordenadas cercanas), para
   minimizar traslados.
2. Mismo operador: que su operador sea persona de la ruta o el mismo operador de otras ya incluidas.
3. Fechas ya definidas: favorece las que tienen "programada_para" dentro de los días de la ruta;
   evita las programadas para otro día.
4. Coincidencias: mismo cliente (misma empresa) que otras ya incluidas, para atenderlas juntas.
5. Prioridad urgente/alta y plazos ("vence") vencidos o que vencen antes de que termine la ruta.
Si la ruta aún no tiene solicitudes, agrupa por zona, cliente y prioridad.${
        variosDias
          ? '\nComo la ruta dura varios días, indica al inicio del motivo el día sugerido para atenderla (formato "Día AAAA-MM-DD: ..."), agrupando por zona para que cada día tenga traslados cortos.'
          : ''
      }
Los clientes (C1, C2…) y operadores (O1, O2…) son seudónimos: iguales significan la misma empresa
o persona. Responde en español; "motivo" en una frase corta y concreta.
Ya incluidas: ${JSON.stringify(elegidas.map(describir))}
Disponibles: ${JSON.stringify(disponibles.map(describir))}`
      const sugeridas = await preguntarGemini(prompt, 8, 'solicitud_id', tiempoEsperaMs)
      const validas = new Set(disponibles.map((item) => item.id))
      return respuesta({
        recomendaciones: sugeridas
          .filter((item) => validas.has(item.solicitud_id))
          .map((item) => ({ solicitud_id: item.solicitud_id, motivo: item.motivo })),
      })
    }

    return respuesta({ error: 'Modo desconocido.' }, 400)
  } catch (error) {
    // Al log va el detalle técnico; al usuario, solo un mensaje comprensible.
    const tecnico =
      error instanceof ErrorIa
        ? (error.detalle ?? error.message)
        : error instanceof Error
          ? error.message
          : 'Error inesperado.'
    logError(tecnico, { funcion: 'recomendar-ia', correlacion_id: correlacionId })
    if (error instanceof ErrorIa)
      return respuesta({ error: error.message, codigo: 'ia_no_disponible' }, error.status)
    return respuesta(
      { error: 'No se pudo obtener la recomendación de IA. Intente de nuevo más tarde.' },
      500,
    )
  }
})
