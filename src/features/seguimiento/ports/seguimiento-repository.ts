import type {
  GarantiaInput,
  SeguimientoSolicitud,
  VisitaInput,
} from '@/features/seguimiento/types/seguimiento.types'

export interface SeguimientoRepository {
  obtener(solicitudId: string): Promise<SeguimientoSolicitud>
  agregarGarantia(input: GarantiaInput): Promise<void>
  programarVisita(input: VisitaInput): Promise<void>
}
