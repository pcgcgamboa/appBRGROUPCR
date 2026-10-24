import nodemailer from 'npm:nodemailer@7.0.6'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import { logError } from './logger.ts'

interface ClienteNotificacion {
  nombre: string
  email_contacto: string | null
}

// `tipo` distingue los dos orígenes que comparten el mismo outbox (notificaciones_envios):
// 'cliente_estado' (cambio de estado de una solicitud, hacia el cliente o hacia soporte según
// configuracion_correo.modo_envio) y 'aviso_interno' (solicitud nueva / postulación nueva, siempre
// hacia correo_soporte, compuesto en SQL — ver 20260911100000_configuracion_correo_avisos_internos.sql).
export interface NotificacionPendiente {
  id: string
  tipo: 'cliente_estado' | 'aviso_interno'
  destinatario: string | null
  estado?: string
  numero?: number
  nombre?: string
  clienteNombre?: string
  asunto?: string
  cuerpoTexto?: string
  /** Presente solo al cerrar una solicitud que tiene un reporte de atención con PDF ya generado
   * — ver reportes_atencion.ruta_storage_pdf (20261005110000_reportes_atencion_y_plantilla.sql). */
  adjuntoPdf?: { nombreArchivo: string; rutaStorage: string }
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
/** Contenido editado por el gestor ("Enviar correo al cliente"); reemplaza el texto automático. */
export interface ContenidoPersonalizado {
  asunto: string
  cuerpoTexto: string
}

export async function iniciarNotificacion(
  solicitudId: string,
  estado: string,
  contenido?: ContenidoPersonalizado,
): Promise<{ pendiente: NotificacionPendiente | null }> {
  const admin = clienteAdmin()
  const { data: config } = await admin
    .from('configuracion_correo')
    .select('notificar_cliente_activo, modo_envio, correo_soporte')
    .eq('id', true)
    .maybeSingle()
  if (!config?.notificar_cliente_activo) return { pendiente: null }

  const { data: solicitud, error: solicitudError } = await admin
    .from('solicitudes')
    .select('numero, nombre, cliente:clientes(nombre, email_contacto)')
    .eq('id', solicitudId)
    .single()
  if (solicitudError) throw solicitudError
  const cliente = solicitud.cliente as unknown as ClienteNotificacion | null
  const destinatario =
    config.modo_envio === 'soporte' ? config.correo_soporte : (cliente?.email_contacto ?? null)

  let adjuntoPdf: NotificacionPendiente['adjuntoPdf']
  if (estado === 'cerrada') {
    const { data: reporte } = await admin
      .from('reportes_atencion')
      .select('nombre_archivo_pdf, ruta_storage_pdf, avance:avances!inner(solicitud_id)')
      .eq('avance.solicitud_id', solicitudId)
      .not('ruta_storage_pdf', 'is', null)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (reporte?.ruta_storage_pdf) {
      adjuntoPdf = {
        nombreArchivo: reporte.nombre_archivo_pdf ?? 'reporte-atencion.pdf',
        rutaStorage: reporte.ruta_storage_pdf,
      }
    }
  }

  const { data: registro, error: registroError } = await admin
    .from('notificaciones_envios')
    .insert({
      tipo: 'cliente_estado',
      solicitud_id: solicitudId,
      estado,
      destinatario,
      resultado: 'pendiente',
      // Queda registrado lo que realmente se envió cuando el gestor editó el contenido.
      asunto: contenido?.asunto ?? null,
      cuerpo_texto: contenido?.cuerpoTexto ?? null,
    })
    .select('id')
    .single()
  if (registroError) throw registroError

  return {
    pendiente: {
      id: registro.id,
      tipo: 'cliente_estado',
      destinatario,
      estado,
      numero: solicitud.numero,
      nombre: solicitud.nombre,
      clienteNombre: cliente?.nombre ?? '',
      asunto: contenido?.asunto,
      cuerpoTexto: contenido?.cuerpoTexto,
      adjuntoPdf,
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
  correlacionId?: string,
) {
  const admin = clienteAdmin()
  try {
    if (!pendiente.destinatario) throw new Error('No hay destinatario configurado para este envío.')
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

    if (pendiente.tipo === 'aviso_interno') {
      // Los avisos internos ya llegan compuestos en texto plano desde el trigger de Postgres que
      // los generó (avisar_solicitud_nueva / notificar_cambio_bolsa_empleo) — sin HTML, para no
      // reimplementar el escape de arriba dentro de PL/pgSQL.
      await transport.sendMail({
        from,
        to: pendiente.destinatario,
        subject: pendiente.asunto ?? 'Aviso interno',
        text: pendiente.cuerpoTexto ?? '',
      })
    } else {
      const estadoLegible = (pendiente.estado ?? '').replaceAll('_', ' ')
      let attachments: { filename: string; content: Uint8Array }[] | undefined
      if (pendiente.adjuntoPdf) {
        const { data: archivo, error: archivoError } = await admin.storage
          .from('reportes-servicio')
          .download(pendiente.adjuntoPdf.rutaStorage)
        if (archivoError) throw archivoError
        attachments = [
          {
            filename: pendiente.adjuntoPdf.nombreArchivo,
            content: new Uint8Array(await archivo.arrayBuffer()),
          },
        ]
      }
      // Contenido editado por el gestor: texto plano tal cual y su versión HTML escapada, con
      // los saltos de línea como párrafos/<br>. Sin edición, el texto automático de siempre.
      const html = pendiente.cuerpoTexto
        ? pendiente.cuerpoTexto
            .split(/\n{2,}/)
            .map((parrafo) => `<p>${escapar(parrafo).replaceAll('\n', '<br>')}</p>`)
            .join('')
        : `<p>Hola ${escapar(pendiente.clienteNombre ?? '')},</p><p>La solicitud <strong>#${pendiente.numero} — ${escapar(pendiente.nombre ?? '')}</strong> cambió al estado <strong>${escapar(estadoLegible)}</strong>.</p>`
      await transport.sendMail({
        from,
        to: pendiente.destinatario,
        subject: pendiente.asunto ?? `Solicitud #${pendiente.numero}: ${estadoLegible}`,
        text:
          pendiente.cuerpoTexto ??
          `La solicitud #${pendiente.numero} (${pendiente.nombre}) cambió al estado: ${estadoLegible}.`,
        html,
        attachments,
      })
    }

    await admin
      .from('notificaciones_envios')
      .update({ resultado: 'enviado', enviado_en: new Date().toISOString() })
      .eq('id', pendiente.id)
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido de correo.'
    // El resultado ya queda en notificaciones_envios (fuente de verdad consultable), pero un log
    // estructurado con correlacion_id permite verlo de inmediato en el explorador de logs de
    // Supabase sin necesidad de consultar la base — útil porque esto corre en segundo plano,
    // después de que la respuesta HTTP de la operación de negocio ya se envió.
    logError(detalle, {
      funcion: 'enviarNotificacionPendiente',
      correlacion_id: correlacionId ?? 'sin-correlacion',
      notificacion_id: pendiente.id,
      tipo: pendiente.tipo,
    })
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
export async function notificarEnSegundoPlano(
  solicitudId: string,
  estado: string,
  correlacionId?: string,
  contenido?: ContenidoPersonalizado,
) {
  try {
    const { pendiente } = await iniciarNotificacion(solicitudId, estado, contenido)
    if (pendiente) EdgeRuntime.waitUntil(enviarNotificacionPendiente(pendiente, correlacionId))
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Error desconocido al notificar.', {
      funcion: 'notificarEnSegundoPlano',
      correlacion_id: correlacionId ?? 'sin-correlacion',
      solicitud_id: solicitudId,
      estado,
    })
  }
}
