import type { NotificacionInterna } from '@/features/notificaciones/types/notificaciones.types'

export interface MarcarNotificacionInput {
  id: number
  leida: boolean
}

/**
 * Puerto del dominio `notificaciones` para el feed interno (admin/encargado)
 * de avisos sobre cambios de clientes y bolsa de empleo. Es un concepto
 * separado de `NotificacionRepository` (configuración de notificaciones por
 * correo al cliente por solicitud): tablas, consumidores y ciclo de vida
 * distintos, aunque viven en el mismo dominio funcional. Define el contrato
 * de acceso a datos sin atarse a Supabase — el adaptador concreto
 * (`adapters/supabase-notificacion-interna-repository.ts`) la implementa con
 * supabase-js, lo que permite sustituirla por un fake en pruebas unitarias
 * sin tocar los hooks ni los componentes.
 */
export interface NotificacionInternaRepository {
  listar(): Promise<NotificacionInterna[]>
  marcar(input: MarcarNotificacionInput): Promise<void>
}
