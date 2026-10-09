import type {
  DocumentoCliente,
  SolicitudCliente,
  TrackingCliente,
} from '@/features/cliente/types/cliente.types'

export interface ValidarAtencionInput {
  solicitud_id: string
  satisfecho: boolean
  comentario: string
  calificacion: number
  llego_a_tiempo: boolean
  recomendaria_tecnico: boolean
}

export interface SubirDocumentoInput {
  clienteId: string
  tipo: DocumentoCliente['tipo']
  nombre: string
  descripcion: string
  fecha: string
  archivo: File
}

/**
 * Puerto del dominio `cliente`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-cliente-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface ClienteRepository {
  solicitudesAtendidas(clienteId?: string | null): Promise<SolicitudCliente[]>
  validarAtencion(input: ValidarAtencionInput): Promise<void>
  documentos(clienteId: string): Promise<DocumentoCliente[]>
  subirDocumento(input: SubirDocumentoInput): Promise<string>
  eliminarDocumento(documento: DocumentoCliente): Promise<string>
  tracking(clienteId: string | null): Promise<TrackingCliente[]>
  urlFirmadaReporte(rutaStorage: string): Promise<string>
}
