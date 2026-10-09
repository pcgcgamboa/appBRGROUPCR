import type { EnvioNotificacion } from '@/features/notificaciones/types/notificaciones.types'

/**
 * Puerto del dominio `notificaciones` para el historial de envíos de correo
 * (cambios de estado al cliente y avisos internos de solicitud/postulación
 * nueva, ambos por `configuracion_correo` — ver `features/configuracion`).
 * Es un concepto separado de `NotificacionInternaRepository` (feed interno
 * de admin/encargado): tablas, consumidores y ciclo de vida distintos,
 * aunque viven en el mismo dominio funcional. Define el contrato de acceso
 * a datos sin atarse a Supabase — el adaptador concreto
 * (`adapters/supabase-notificacion-repository.ts`) la implementa con
 * supabase-js, lo que permite sustituirla por un fake en pruebas unitarias
 * sin tocar los hooks ni los componentes.
 */
export interface NotificacionRepository {
  envios(solicitudId?: string): Promise<EnvioNotificacion[]>
}
