import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { notificarEstado } from '../_shared/notificaciones.ts'

function respuesta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
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
    if (solicitudActual.estado !== payload.estado_nuevo)
      await notificarEstado(payload.solicitud_id, payload.estado_nuevo).catch(console.error)
    return respuesta({ avance_id: data }, 201)
  } catch (error) {
    return respuesta({ error: error instanceof Error ? error.message : 'Error inesperado.' }, 400)
  }
})
