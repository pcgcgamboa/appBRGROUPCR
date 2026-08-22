import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { corsHeaders } from '../_shared/cors.ts'
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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: reclamadas, error } = await admin.rpc('reclamar_notificaciones_pendientes', {
    p_limite: 20,
  })
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  for (const fila of reclamadas ?? []) {
    await enviarNotificacionPendiente(
      {
        id: fila.id,
        destinatario: fila.destinatario,
        numero: fila.numero,
        nombre: fila.nombre,
        clienteNombre: fila.cliente_nombre ?? '',
      },
      fila.estado,
    )
  }

  return new Response(JSON.stringify({ procesadas: reclamadas?.length ?? 0 }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
