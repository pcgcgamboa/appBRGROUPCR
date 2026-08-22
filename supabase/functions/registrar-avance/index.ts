import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { notificarEnSegundoPlano } from '../_shared/notificaciones.ts'

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
    const { data: solicitudActual, error: solicitudError } = await supabase
      .from('solicitudes')
      .select('estado')
      .eq('id', payload.solicitud_id)
      .single()
    if (solicitudError) throw solicitudError
    const { data, error } = await supabase.rpc('registrar_avance_operador', {
      p_solicitud_id: payload.solicitud_id,
      p_horas_trabajadas: payload.horas_trabajadas,
      p_porcentaje: payload.porcentaje,
      p_narrativa: payload.narrativa,
      p_estado_nuevo: payload.estado_nuevo,
      p_materiales: payload.materiales ?? [],
      p_adjuntos: payload.adjuntos ?? [],
    })
    if (error) throw error
    // El registro `pendiente` se inserta antes de responder; el envío SMTP es en segundo plano.
    if (solicitudActual.estado !== payload.estado_nuevo)
      await notificarEnSegundoPlano(payload.solicitud_id, payload.estado_nuevo)
    return respuesta({ avance_id: data }, 201)
  } catch (error) {
    return respuesta({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 400)
  }
})
