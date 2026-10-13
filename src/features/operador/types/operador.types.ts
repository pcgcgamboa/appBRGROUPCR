import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export interface SolicitudOperador {
  id: string
  numero: number
  nombre: string
  detalle: string
  estado: EstadoSolicitud
  prioridad: string | null
  cliente_id: string | null
  cliente: { nombre: string } | null
  tipo: { nombre: string } | null
  equipo: {
    nombre: string
    marca: string | null
    modelo: string | null
    serie: string | null
  } | null
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

export interface PerfilTecnico {
  id: string
  nombre_completo: string
  telefono: string | null
  foto_url: string | null
}

export interface ActualizarPerfilTecnicoInput {
  usuario_id: string
  nombre_completo: string
  telefono: string
}

export interface HerramientaTecnico {
  id: string
  asignada_en: string
  observaciones_entrega: string | null
  herramienta: { nombre: string; numero_activo: string } | null
}

export interface EventoTecnico {
  id: number
  tipo: string
  titulo: string
  descripcion: string | null
  creado_en: string
}

export interface ContextoSolicitudTecnico {
  cliente: string
  ubicacion: {
    nombre: string
    provincia: string
    canton: string
    distrito: string
    otras_senas: string | null
  }
  ruta: {
    codigo: string
    nombre: string
    fecha_programada: string
    estado: string
    encargado: string
  } | null
  eventos: EventoTecnico[]
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
  /** Categoría fija de foto del reporte de atención (ver CATEGORIAS_FOTO_REPORTE); null en
   * adjuntos normales que no pertenecen al reporte. */
  categoria?: string | null
}

export type EstadoEquipoFinal = 'funcionando' | 'parcial' | 'sin_funcionar'

export interface ReporteAtencionInput {
  hora_llegada: string | null
  hora_salida: string | null
  checklist_area_trabajo_segura: boolean
  checklist_equipo_probado: boolean
  checklist_cliente_capacitado: boolean
  checklist_requiere_seguimiento: boolean
  checklist_notas: string
  estado_equipo_final: EstadoEquipoFinal
  recomendaciones: string
  /** Imagen PNG en data URL, capturada del canvas de firma — ver signature-pad.tsx. */
  firma_tecnico: string
  firma_cliente: string
  cedula_cliente_firma: string
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
  /** Presente solo cuando el operador activa "Generar reporte de atención". */
  reporte?: ReporteAtencionInput | null
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
  adjuntos: {
    id: string
    nombre_archivo: string
    tipo: string
    ruta_storage: string
    categoria: string | null
  }[]
  /** Datos completos del reporte: permiten regenerar el PDF si no se generó al registrar el avance. */
  reporte_atencion:
    | (Omit<ReporteAtencionInput, 'checklist_notas' | 'recomendaciones'> & {
        checklist_notas: string | null
        recomendaciones: string | null
        ruta_storage_pdf: string | null
        nombre_archivo_pdf: string | null
        creado_por: string
      })
    | null
}
