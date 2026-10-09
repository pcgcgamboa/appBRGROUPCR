import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logError } from '../_shared/logger.ts'

type BucketDocumento = 'clientes-documentos' | 'whatsapp-adjuntos'

interface Peticion {
  destinatario_tipo: 'cliente' | 'usuario'
  destinatario_id: string
  tipo: 'mensaje' | 'documento'
  mensaje?: string
  documento_ruta_storage?: string
  documento_nombre?: string
  documento_bucket?: BucketDocumento
  // 'bridge' (por defecto): envío automático real vía whatsapp-bridge/, requiere
  // WHATSAPP_BRIDGE_URL/_API_KEY configurados. 'directo': arma un enlace "clic para chatear"
  // (wa.me) con el mensaje ya escrito y lo devuelve para que el navegador lo abra — no requiere el
  // bridge, pero tampoco confirma que la persona haya presionado Enviar (ver resultado 'preparado').
  modo?: 'bridge' | 'directo'
}

interface RespuestaBridge {
  ok: boolean
  error?: string
}

// Lista blanca: documento_bucket viaja en el payload del cliente, así que se valida contra un
// conjunto fijo en vez de confiar en el valor recibido — evita que alguien pida firmar una URL de
// un bucket privado no relacionado (p. ej. solicitudes-adjuntos) pasando ese nombre a mano.
// 'clientes-documentos' es el expediente formal del cliente (ver ClientDocumentsManager);
// 'whatsapp-adjuntos' son archivos subidos al vuelo desde WhatsappSendPanel (ver esa migración).
const BUCKETS_PERMITIDOS: BucketDocumento[] = ['clientes-documentos', 'whatsapp-adjuntos']

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authorization = request.headers.get('Authorization') ?? ''
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    })
    const { data: esGestor, error: roleError } = await caller.rpc('es_gestor')
    if (roleError || !esGestor) return respuesta({ error: 'Acceso denegado.' }, 403)
    const { data: authData } = await caller.auth.getUser()
    const enviadoPor = authData.user?.id ?? null

    const payload = (await request.json()) as Peticion
    if (!payload.destinatario_id || !payload.destinatario_tipo || !payload.tipo)
      return respuesta({ error: 'Datos incompletos.' }, 400)
    if (payload.tipo === 'mensaje' && !payload.mensaje?.trim())
      return respuesta({ error: 'El mensaje no puede estar vacío.' }, 400)
    if (
      payload.tipo === 'documento' &&
      (!payload.documento_ruta_storage || !payload.documento_nombre)
    )
      return respuesta({ error: 'Falta el documento a enviar.' }, 400)
    if (
      payload.tipo === 'documento' &&
      (!payload.documento_bucket || !BUCKETS_PERMITIDOS.includes(payload.documento_bucket))
    )
      return respuesta({ error: 'Origen de documento inválido.' }, 400)

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    const telefono =
      payload.destinatario_tipo === 'cliente'
        ? await obtenerTelefono(admin, 'clientes', 'telefono_contacto', payload.destinatario_id)
        : await obtenerTelefono(admin, 'usuarios', 'telefono', payload.destinatario_id)
    if (!telefono)
      return respuesta({ error: 'El destinatario no tiene un teléfono registrado.' }, 400)

    if (payload.modo === 'directo') {
      let mensajeFinal = payload.mensaje?.trim() ?? ''
      if (payload.tipo === 'documento') {
        const { data: firmada, error: firmaError } = await admin.storage
          .from(payload.documento_bucket!)
          .createSignedUrl(payload.documento_ruta_storage!, 600)
        if (firmaError) throw firmaError
        const encabezado = mensajeFinal || 'Le compartimos el documento solicitado:'
        mensajeFinal = `${encabezado}\n${payload.documento_nombre}\n${firmada.signedUrl}`
      }
      const url = `https://wa.me/${normalizarTelefono(telefono)}?text=${encodeURIComponent(mensajeFinal)}`

      await admin.from('whatsapp_envios').insert({
        tipo: payload.tipo,
        destinatario_tipo: payload.destinatario_tipo,
        destinatario_id: payload.destinatario_id,
        telefono,
        mensaje: payload.mensaje ?? null,
        documento_ruta_storage: payload.documento_ruta_storage ?? null,
        documento_nombre: payload.documento_nombre ?? null,
        resultado: 'preparado',
        detalle_error: null,
        enviado_por: enviadoPor,
      })

      return respuesta({ ok: true, url })
    }

    const bridgeUrl = Deno.env.get('WHATSAPP_BRIDGE_URL')
    const bridgeKey = Deno.env.get('WHATSAPP_BRIDGE_API_KEY')
    if (!bridgeUrl || !bridgeKey)
      return respuesta({ error: 'El servicio de WhatsApp no está configurado.' }, 500)

    const resultadoEnvio =
      payload.tipo === 'mensaje'
        ? await enviarMensaje(bridgeUrl, bridgeKey, telefono, payload.mensaje!)
        : await enviarDocumento(bridgeUrl, bridgeKey, admin, telefono, payload)

    await admin.from('whatsapp_envios').insert({
      tipo: payload.tipo,
      destinatario_tipo: payload.destinatario_tipo,
      destinatario_id: payload.destinatario_id,
      telefono,
      mensaje: payload.mensaje ?? null,
      documento_ruta_storage: payload.documento_ruta_storage ?? null,
      documento_nombre: payload.documento_nombre ?? null,
      resultado: resultadoEnvio.ok ? 'enviado' : 'error',
      detalle_error: resultadoEnvio.ok ? null : (resultadoEnvio.error ?? 'Error desconocido.'),
      enviado_por: enviadoPor,
    })

    if (!resultadoEnvio.ok)
      return respuesta({ error: resultadoEnvio.error ?? 'No se pudo enviar el WhatsApp.' }, 502)
    return respuesta({ ok: true })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error inesperado.'
    logError(mensaje, { funcion: 'enviar-whatsapp', correlacion_id: correlacionId })
    return respuesta({ error: mensaje }, 500)
  }
})

// Los teléfonos se guardan en formato local costarricense (8 dígitos, sin código de país); wa.me
// exige el número completo en formato internacional, solo dígitos. Si ya trae código de país
// (más de 8 dígitos) se deja tal cual, solo se limpian espacios/guiones/paréntesis.
function normalizarTelefono(telefono: string): string {
  const soloDigitos = telefono.replace(/\D/g, '')
  return soloDigitos.length <= 8 ? `506${soloDigitos}` : soloDigitos
}

async function obtenerTelefono(
  admin: SupabaseClient,
  tabla: string,
  columna: string,
  id: string,
): Promise<string | null> {
  const { data, error } = await admin.from(tabla).select(columna).eq('id', id).single()
  if (error) throw error
  return (data as Record<string, string | null>)[columna]
}

async function enviarMensaje(
  bridgeUrl: string,
  bridgeKey: string,
  telefono: string,
  mensaje: string,
): Promise<RespuestaBridge> {
  const respuesta = await fetch(`${bridgeUrl}/send-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': bridgeKey },
    body: JSON.stringify({ telefono, mensaje }),
  })
  return (await respuesta.json()) as RespuestaBridge
}

async function enviarDocumento(
  bridgeUrl: string,
  bridgeKey: string,
  admin: SupabaseClient,
  telefono: string,
  payload: Peticion,
): Promise<RespuestaBridge> {
  const { data: firmada, error: firmaError } = await admin.storage
    .from(payload.documento_bucket!)
    .createSignedUrl(payload.documento_ruta_storage!, 300)
  if (firmaError) throw firmaError
  const respuesta = await fetch(`${bridgeUrl}/send-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': bridgeKey },
    body: JSON.stringify({
      telefono,
      url: firmada.signedUrl,
      nombre_archivo: payload.documento_nombre,
      mensaje: payload.mensaje,
    }),
  })
  return (await respuesta.json()) as RespuestaBridge
}
