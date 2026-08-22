import nodemailer from 'npm:nodemailer@7.0.6'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

interface ClienteNotificacion {
  nombre: string
  email_contacto: string | null
}

export interface NotificacionPendiente {
  id: string
  destinatario: string | null
  numero: number
  nombre: string
  clienteNombre: string
}

function escapar(valor: string) {
  return valor.replace(
    /[&<>'"]/g,
    (caracter) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[caracter] ??
      caracter,
  )
}

function clienteAdmin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

// Fase síncrona: se ejecuta con `await` antes de responder al cliente, para que el registro
// `pendiente` en notificaciones_envios exista de inmediato (sin ventana de carrera) — es solo
// una inserción, de latencia despreciable frente al envío SMTP real. Los callers deben envolver
// esta llamada en su propio try/catch: un fallo aquí no debe convertir la respuesta de la
// operación de negocio (ya exitosa) en un error 500.
export async function iniciarNotificacion(
  solicitudId: string,
  estado: string,
): Promise<{ pendiente: NotificacionPendiente | null }> {
  const admin = clienteAdmin()
  const { data: config } = await admin
    .from('notificaciones_config')
    .select('activa')
    .eq('solicitud_id', solicitudId)
    .eq('estado', estado)
    .maybeSingle()
  if (!config?.activa) return { pendiente: null }

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

  return {
    pendiente: {
      id: registro.id,
      destinatario,
      numero: solicitud.numero,
      nombre: solicitud.nombre,
      clienteNombre: cliente?.nombre ?? '',
    },
  }
}

// Fase asíncrona: el envío SMTP real. Los callers la despachan dentro de EdgeRuntime.waitUntil(...)
// después de responder al cliente, para que una caída o lentitud del servidor SMTP no agregue
// latencia a la operación de negocio. Captura todos sus errores internamente y actualiza
// notificaciones_envios a 'error' en vez de propagar la excepción: al ejecutarse en segundo plano,
// una excepción no capturada aquí se convertiría en un unhandledrejection sin caller síncrono que
// la atrape.
export async function enviarNotificacionPendiente(
  pendiente: NotificacionPendiente,
  estado: string,
) {
  const admin = clienteAdmin()
  try {
    if (!pendiente.destinatario)
      throw new Error('El cliente no tiene correo de contacto configurado.')
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
      to: pendiente.destinatario,
      subject: `Solicitud #${pendiente.numero}: ${estadoLegible}`,
      text: `La solicitud #${pendiente.numero} (${pendiente.nombre}) cambió al estado: ${estadoLegible}.`,
      html: `<p>Hola ${escapar(pendiente.clienteNombre)},</p><p>La solicitud <strong>#${pendiente.numero} — ${escapar(pendiente.nombre)}</strong> cambió al estado <strong>${escapar(estadoLegible)}</strong>.</p>`,
    })
    await admin
      .from('notificaciones_envios')
      .update({ resultado: 'enviado', enviado_en: new Date().toISOString() })
      .eq('id', pendiente.id)
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido de correo.'
    await admin
      .from('notificaciones_envios')
      .update({ resultado: 'error', detalle_error: detalle })
      .eq('id', pendiente.id)
  }
}

// Combina las dos fases para los callers (gestionar-solicitud, registrar-avance): deja
// constancia del intento (síncrono, latencia despreciable) y despacha el envío SMTP real en
// segundo plano. Un fallo al iniciar la notificación no debe convertir la respuesta de la
// operación de negocio, ya exitosa, en un error — por eso captura sus propios errores.
export async function notificarEnSegundoPlano(solicitudId: string, estado: string) {
  try {
    const { pendiente } = await iniciarNotificacion(solicitudId, estado)
    if (pendiente) EdgeRuntime.waitUntil(enviarNotificacionPendiente(pendiente, estado))
  } catch (error) {
    console.error(error)
  }
}
