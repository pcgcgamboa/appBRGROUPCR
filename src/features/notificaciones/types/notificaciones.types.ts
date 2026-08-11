import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

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
