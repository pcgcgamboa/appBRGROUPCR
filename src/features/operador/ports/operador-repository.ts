import type {
  ActualizarPerfilTecnicoInput,
  AvanceResumen,
  ContextoSolicitudTecnico,
  HerramientaTecnico,
  PerfilTecnico,
  RegistrarAvanceInput,
  SolicitudOperador,
} from '@/features/operador/types/operador.types'

/**
 * Puerto del dominio `operador`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-operador-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface OperadorRepository {
  perfilTecnico(usuarioId: string): Promise<PerfilTecnico>
  actualizarPerfilTecnico(input: ActualizarPerfilTecnicoInput): Promise<void>
  herramientasTecnico(usuarioId: string): Promise<HerramientaTecnico[]>
  contextoSolicitudTecnico(solicitudId: string): Promise<ContextoSolicitudTecnico>
  solicitudesOperador(usuarioId: string): Promise<SolicitudOperador[]>
  avancesSolicitud(solicitudId: string): Promise<AvanceResumen[]>
  registrarAvance(input: RegistrarAvanceInput): Promise<{ avance_id: string }>
  solicitarResolucion(input: {
    solicitud_id: string
    tipo: 'cierre' | 'cancelacion'
    motivo: string
  }): Promise<string>
  subirAdjunto(rutaStorage: string, archivo: File): Promise<void>
  eliminarAdjuntos(rutasStorage: string[]): Promise<void>
}
