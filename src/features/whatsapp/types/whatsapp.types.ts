export type DestinatarioWhatsapp = 'cliente' | 'usuario'

// 'clientes-documentos' es el expediente formal ya subido al cliente; 'whatsapp-adjuntos' es un
// archivo subido al vuelo desde la computadora al momento de enviar (ver WhatsappSendPanel).
export type BucketDocumentoWhatsapp = 'clientes-documentos' | 'whatsapp-adjuntos'

export interface EnviarWhatsappInput {
  destinatario_tipo: DestinatarioWhatsapp
  destinatario_id: string
  tipo: 'mensaje' | 'documento'
  mensaje?: string
  documento_ruta_storage?: string
  documento_nombre?: string
  documento_bucket?: BucketDocumentoWhatsapp
  // 'bridge' (por defecto): envío automático real, requiere whatsapp-bridge/ configurado.
  // 'directo': arma un enlace "clic para chatear" (wa.me) que el navegador abre — sin bridge, pero
  // sin confirmación de que la persona haya presionado Enviar (ver WhatsappEnvio.resultado).
  modo?: 'bridge' | 'directo'
}

export interface EnviarWhatsappResultado {
  url?: string
}

export interface AdjuntoSubido {
  ruta_storage: string
  nombre_archivo: string
}

export interface WhatsappEnvio {
  id: string
  tipo: 'mensaje' | 'documento'
  telefono: string
  mensaje: string | null
  documento_nombre: string | null
  resultado: 'enviado' | 'error' | 'preparado'
  detalle_error: string | null
  creado_en: string
}
