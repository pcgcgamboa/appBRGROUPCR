import nodemailer from 'npm:nodemailer@7.0.6'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

interface ClienteNotificacion {
  nombre: string
  email_contacto: string | null
}

function escapar(valor: string) {
  return valor.replace(
    /[&<>'"]/g,
    (caracter) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter] ??
      caracter,
  )
}

export async function notificarEstado(solicitudId: string, estado: string) {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
  const { data: config } = await admin
    .from('notificaciones_config')
    .select('activa')
    .eq('solicitud_id', solicitudId)
    .eq('estado', estado)
    .maybeSingle()
  if (!config?.activa) return { resultado: 'omitido' }

  const { data: solicitud, error: solicitudError } = await admin
    .from('solicitudes')
    .select('numero, nombre, cliente:clientes(nombre, email_contacto)')
    .eq('id', solicitudId)
    .single()
  if (solicitudError) throw solicitudError
  const cliente = solicitud.cliente as unknown as ClienteNotificacion | null
  const destinatario = cliente?.email_contacto ?? null
  const { data: registro, error: registroError } = await admin
    .from('notificaciones_envios')
    .insert({ solicitud_id: solicitudId, estado, destinatario, resultado: 'pendiente' })
    .select('id')
    .single()
  if (registroError) throw registroError

  try {
    if (!destinatario) throw new Error('El cliente no tiene correo de contacto configurado.')
    const host = Deno.env.get('SMTP_HOST')
    const from = Deno.env.get('SMTP_FROM')
    if (!host || !from) throw new Error('SMTP_HOST y SMTP_FROM son obligatorios.')
    const port = Number(Deno.env.get('SMTP_PORT') ?? '587')
    const user = Deno.env.get('SMTP_USER')
    const pass = Deno.env.get('SMTP_PASSWORD')
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: (Deno.env.get('SMTP_SECURE') ?? 'false') === 'true',
      auth: user && pass ? { user, pass } : undefined,
    })
    const estadoLegible = estado.replaceAll('_', ' ')
    await transport.sendMail({
      from,
      to: destinatario,
      subject: `Solicitud #${solicitud.numero}: ${estadoLegible}`,
      text: `La solicitud #${solicitud.numero} (${solicitud.nombre}) cambió al estado: ${estadoLegible}.`,
      html: `<p>Hola ${escapar(cliente?.nombre ?? '')},</p><p>La solicitud <strong>#${solicitud.numero} — ${escapar(solicitud.nombre)}</strong> cambió al estado <strong>${escapar(estadoLegible)}</strong>.</p>`,
    })
    await admin
      .from('notificaciones_envios')
      .update({ resultado: 'enviado', enviado_en: new Date().toISOString() })
      .eq('id', registro.id)
    return { resultado: 'enviado' }
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido de correo.'
    await admin
      .from('notificaciones_envios')
      .update({ resultado: 'error', detalle_error: detalle })
      .eq('id', registro.id)
    return { resultado: 'error', detalle }
  }
}
