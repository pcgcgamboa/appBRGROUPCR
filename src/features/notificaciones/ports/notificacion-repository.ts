import type {
  EnvioNotificacion,
  SolicitudNotificaciones,
} from '@/features/notificaciones/types/notificaciones.types'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export interface GuardarNotificacionInput {
  solicitud_id: string
  estado: EstadoSolicitud
  activa: boolean
}

/**
 * Puerto del dominio `notificaciones` para la configuración de avisos por
 * correo al cliente, por solicitud y por estado, y el historial de envíos.
 * Es un concepto separado de `NotificacionInternaRepository` (feed interno
 * de admin/encargado): tablas, consumidores y ciclo de vida distintos,
 * aunque viven en el mismo dominio funcional. Define el contrato de acceso
 * a datos sin atarse a Supabase — el adaptador concreto
 * (`adapters/supabase-notificacion-repository.ts`) la implementa con
 * supabase-js, lo que permite sustituirla por un fake en pruebas unitarias
 * sin tocar los hooks ni los componentes.
 */
export interface NotificacionRepository {
  configuracion(): Promise<SolicitudNotificaciones[]>
  guardar(input: GuardarNotificacionInput): Promise<void>
  envios(solicitudId?: string): Promise<EnvioNotificacion[]>
}
