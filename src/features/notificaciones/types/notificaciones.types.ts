import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export interface NotificacionInterna {
  id: number
  tipo: 'bolsa_empleo' | 'cliente'
  titulo: string
  mensaje: string
  entidad_tipo: string
  entidad_id: string
  creado_en: string
  lecturas: { usuario_id: string; leida_en: string }[]
}

export interface SolicitudNotificaciones {
  id: string
  numero: number
  nombre: string
  estado: EstadoSolicitud
  cliente: { nombre: string; email_contacto: string | null } | null
  notificaciones_config: { estado: EstadoSolicitud; activa: boolean }[]
}

export interface EnvioNotificacion {
  id: string
  solicitud_id: string
  estado: EstadoSolicitud
  destinatario: string | null
  resultado: 'pendiente' | 'enviado' | 'error'
  detalle_error: string | null
  creado_en: string
}
