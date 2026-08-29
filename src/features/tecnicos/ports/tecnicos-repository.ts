import type { Tecnico } from '@/features/catalogos/types/catalogos.types'

export interface TecnicosSolicitud {
  tecnicos: Tecnico[]
  asignados: string[]
}

export interface AsignarTecnicosInput {
  solicitudId: string
  tecnicos: string[]
}

export type TipoDocumentoPostulacion = 'hoja_vida' | 'hoja_delincuencia' | 'cedula' | 'fotografia'

export interface DocumentoPostulacion {
  id: string
  tipo: TipoDocumentoPostulacion
  nombre_archivo: string
  ruta_storage: string
  mime_type: string
  tamano_bytes: number
}

export interface PostulacionTecnico {
  id: string
  nombre_completo: string
  identificacion: string
  especialidad: 'albanil' | 'soldador' | 'chofer'
  celular: string
  correo: string | null
  provincia: string
  canton: string
  direccion: string | null
  experiencia: string
  disponibilidad: string | null
  pretension_salarial: number
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  creado_en: string
  documentos: DocumentoPostulacion[]
}

export interface CrearPostulacionInput {
  nombre: string
  identificacion: string
  especialidad: 'albanil' | 'soldador' | 'chofer'
  celular: string
  correo: string
  provincia: string
  canton: string
  direccion: string
  experiencia: string
  disponibilidad: string
  pretensionSalarial: number
  documentos: Record<TipoDocumentoPostulacion, File>
}

export interface TecnicosRepository {
  tecnicosSolicitud(solicitudId: string): Promise<TecnicosSolicitud>
  asignarTecnicos(input: AsignarTecnicosInput): Promise<void>
  crearPostulacion(input: CrearPostulacionInput): Promise<string>
  listarPostulacionesPendientes(): Promise<PostulacionTecnico[]>
  resolverPostulacion(id: string, aprobar: boolean, comentario: string): Promise<void>
  obtenerUrlDocumento(ruta: string): Promise<string>
}
