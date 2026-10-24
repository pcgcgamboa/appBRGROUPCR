export interface NotificacionInterna {
  id: number
  tipo: 'bolsa_empleo' | 'cliente' | 'solicitud'
  titulo: string
  mensaje: string
  entidad_tipo: string
  entidad_id: string
  creado_en: string
  lecturas: { usuario_id: string; leida_en: string }[]
}

export interface EnvioNotificacion {
  id: string
  tipo: 'cliente_estado' | 'aviso_interno'
  solicitud_id: string | null
  estado: string | null
  asunto: string | null
  destinatario: string | null
  resultado: 'pendiente' | 'enviado' | 'error'
  detalle_error: string | null
  creado_en: string
}
