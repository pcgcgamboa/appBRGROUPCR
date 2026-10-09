export interface SolicitudCliente {
  id: string
  numero: number
  nombre: string
  detalle: string
  estado: 'atendida' | 'cerrada'
  atendida_en: string | null
  cerrada_en: string | null
  tipo: { nombre: string } | null
  operador: { nombre_completo: string } | null
  avances: { reportes_atencion: { ruta_storage_pdf: string; nombre_archivo_pdf: string } | null }[]
  validacion: {
    satisfecho: boolean
    comentario: string | null
    calificacion: number | null
    llego_a_tiempo: boolean | null
    recomendaria_tecnico: boolean | null
    validado_en: string
  } | null
}

export type DocumentoCliente = {
  id: string
  cliente_id: string
  tipo: 'contrato' | 'identificacion' | 'factura' | 'proforma' | 'otro'
  nombre: string
  descripcion: string | null
  fecha_documento: string | null
  nombre_archivo: string
  ruta_storage: string
  mime_type: string
  tamano_bytes: number
  creado_en: string
  usuario: { nombre_completo: string } | null
  url?: string
}

export type TrackingCliente = {
  id: number
  solicitud_id: string
  tipo: string
  titulo: string
  descripcion: string | null
  creado_en: string
  solicitud: { numero: number; nombre: string } | null
  actor: { nombre_completo: string } | null
}
