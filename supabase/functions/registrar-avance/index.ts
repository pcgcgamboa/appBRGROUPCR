import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logError } from '../_shared/logger.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Identificador único por solicitud, incluido en toda respuesta (éxito o error) para poder
  // correlacionar un reporte de usuario/soporte con esta invocación puntual de la función.
  const correlacionId = crypto.randomUUID()
  function respuesta(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify({ ...body, correlacion_id: correlacionId }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (request.method !== 'POST') return respuesta({ error: 'Método no permitido.' }, 405)

  try {
    const authorization = request.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authorization } } },
    )
    const payload = await request.json()
    const { data, error } = await supabase.rpc('registrar_avance_operador', {
      p_solicitud_id: payload.solicitud_id,
      p_horas_trabajadas: payload.horas_trabajadas,
      p_porcentaje: payload.porcentaje,
      p_narrativa: payload.narrativa,
      p_estado_nuevo: payload.estado_nuevo,
      p_materiales: payload.materiales ?? [],
      p_adjuntos: payload.adjuntos ?? [],
      // Un reintento del cliente con la misma clave (timeout, señal débil) devuelve el avance
      // ya registrado en vez de duplicarlo — ver 20260822130000_idempotencia_mutaciones_criticas.sql.
      p_idempotencia_clave: payload.idempotencia_clave ?? null,
      // Reporte de atención opcional: checklist, estado final del equipo y ambas firmas — ver
      // 20261005110000_reportes_atencion_y_plantilla.sql.
      p_reporte: payload.reporte ?? null,
    })
    if (error) throw error
    return respuesta({ avance_id: data }, 201)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error inesperado.'
    logError(mensaje, { funcion: 'registrar-avance', correlacion_id: correlacionId })
    return respuesta({ error: mensaje }, 400)
  }
})
