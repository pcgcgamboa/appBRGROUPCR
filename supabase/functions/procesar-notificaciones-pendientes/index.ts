import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
import { logError, logInfo } from '../_shared/logger.ts'
import { enviarNotificacionPendiente } from '../_shared/notificaciones.ts'

// Invocada por el job de pg_cron `procesar-notificaciones-pendientes` (cada 5 minutos, ver
// supabase/migrations/20260822120000_outbox_notificaciones.sql) para reintentar notificaciones
// que quedaron en 'pendiente' o 'error'. No hay usuario detrás de esta invocación: corre con
// service_role y reclama su propio lote de trabajo vía la función de Postgres
// reclamar_notificaciones_pendientes (bloqueo con `skip locked`, segura ante ejecuciones
// superpuestas). Reutiliza enviarNotificacionPendiente tal cual la usa el camino normal
// (gestionar-solicitud/registrar-avance), sin duplicar la lógica de envío SMTP.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Sin usuario detrás de esta invocación (la dispara pg_cron): un id propio por corrida deja
  // rastro en los logs de cada lote procesado, la única forma de confirmar que el job sigue vivo
  // sin depender de que alguien note que notificaciones_envios dejó de moverse.
  const correlacionId = crypto.randomUUID()

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: reclamadas, error } = await admin.rpc('reclamar_notificaciones_pendientes', {
    p_limite: 20,
  })
  if (error) {
    logError(error.message, {
      funcion: 'procesar-notificaciones-pendientes',
      correlacion_id: correlacionId,
    })
    return new Response(JSON.stringify({ error: error.message, correlacion_id: correlacionId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  for (const fila of reclamadas ?? []) {
    await enviarNotificacionPendiente(
      {
        id: fila.id,
        tipo: fila.tipo,
        destinatario: fila.destinatario,
        estado: fila.estado ?? undefined,
        numero: fila.numero ?? undefined,
        nombre: fila.nombre ?? undefined,
        clienteNombre: fila.cliente_nombre ?? undefined,
        asunto: fila.asunto ?? undefined,
        cuerpoTexto: fila.cuerpo_texto ?? undefined,
      },
      correlacionId,
    )
  }

  logInfo('Lote de notificaciones pendientes procesado.', {
    funcion: 'procesar-notificaciones-pendientes',
    correlacion_id: correlacionId,
    procesadas: reclamadas?.length ?? 0,
  })
  return new Response(
    JSON.stringify({ procesadas: reclamadas?.length ?? 0, correlacion_id: correlacionId }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
