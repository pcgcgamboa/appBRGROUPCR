import type {
  EnviarMensajeInput,
  MensajeInterno,
} from '@/features/mensajeria/types/mensajeria.types'

/**
 * Puerto del dominio `mensajeria`: comunicación libre entre administrador,
 * encargado y operador (staff), sin el cliente/solicitante — complementa,
 * sin tocar, `solicitud_comunicaciones` (chat por ticket donde el cliente sí
 * participa) y `notificaciones_internas` (feed de eventos de sistema, solo
 * lectura vía triggers). El adaptador concreto
 * (`adapters/supabase-mensaje-interno-repository.ts`) lo implementa con
 * supabase-js, lo que permite sustituirlo por un fake en pruebas unitarias
 * sin tocar los hooks ni los componentes.
 */
export interface MensajeInternoRepository {
  /** Mensajes directos donde el usuario actual es remitente o destinatario. */
  listarDirectos(): Promise<MensajeInterno[]>
  /** Mensajes de difusión a un rol, visibles según RLS (propio rol o enviados por mí). */
  listarDifusiones(): Promise<MensajeInterno[]>
  /** Notas internas de una solicitud específica (staff, nunca el cliente). */
  listarPorSolicitud(solicitudId: string): Promise<MensajeInterno[]>
  enviar(input: EnviarMensajeInput): Promise<void>
  marcarLeido(mensajeId: string): Promise<void>
}
