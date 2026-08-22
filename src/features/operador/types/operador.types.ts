import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export interface SolicitudOperador {
  id: string
  numero: number
  nombre: string
  detalle: string
  estado: EstadoSolicitud
  prioridad: string | null
  cliente: { nombre: string } | null
  tipo: { nombre: string } | null
  peticiones: PeticionResolucion[]
  ruta: {
    vehiculo_id: string | null
    vehiculo: { placa: string; tipo: string } | null
    provincia: string
    canton: string
    distrito: string
    otras_senas: string | null
  } | null
}

export interface PeticionResolucion {
  id: string
  tipo: 'cierre' | 'cancelacion'
  motivo: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  creado_en: string
  comentario_resolucion: string | null
}

export interface MaterialAvanceInput {
  key: string
  material_id: string
  nombre: string
  descripcion: string
  unidad_medida: string
  cantidad: string
  costo_referencial: string
}

export interface AdjuntoAvanceInput {
  id: string
  nombre_archivo: string
  ruta_storage: string
  tipo: 'imagen' | 'documento'
  mime_type: string
  tamano_bytes: number
}

export interface RegistrarAvanceInput {
  solicitud_id: string
  horas_trabajadas: number
  porcentaje: number
  narrativa: string
  estado_nuevo: EstadoSolicitud
  materiales: Omit<MaterialAvanceInput, 'key'>[]
  adjuntos: AdjuntoAvanceInput[]
  /** Estable mientras exista el borrador de esta solicitud — ver `obtenerClaveIdempotencia`. Un
   * reintento con la misma clave devuelve el avance ya registrado en vez de duplicarlo. */
  idempotencia_clave: string
}

export type EstadoSubidaAdjunto = 'pendiente' | 'subiendo' | 'listo' | 'error'

export interface AttachmentUploadItem {
  localId: string
  file?: File
  previewUrl?: string
  estado: EstadoSubidaAdjunto
  error?: string
  adjunto?: AdjuntoAvanceInput
}

export interface AvanceResumen {
  id: string
  horas_trabajadas: number
  porcentaje: number
  narrativa: string
  creado_en: string
  vehiculo: { placa: string } | null
  solicitud_materiales: {
    cantidad: number
    material: { nombre: string; unidad_medida: string } | null
  }[]
  adjuntos: { id: string; nombre_archivo: string; tipo: string }[]
}
