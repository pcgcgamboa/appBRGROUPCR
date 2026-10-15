export type EstadoSolicitud =
  /** Borrador del Cliente: el proveedor no lo trabaja hasta que se envía. */
  | 'creada'
  /** Enviada por el Cliente: lista para que el proveedor la procese. */
  | 'enviada'
  | 'asignada'
  | 'en_atencion'
  | 'en_espera_materiales'
  | 'atendida'
  | 'cerrada'
  | 'cancelada'
  | 'rechazada'

export interface SolicitudAdmin {
  id: string
  numero: number
  nombre: string
  detalle: string
  /** Si es una solicitud de garantía: la solicitud original que reclama. */
  original: { numero: number } | null
  /** Equipo del cliente sobre el que se solicita el servicio (si aplica). */
  equipo: {
    nombre: string
    marca: string | null
    modelo: string | null
    serie: string | null
  } | null
  cliente_id: string
  ubicacion_id: string
  prioridad: 'baja' | 'media' | 'alta' | 'urgente' | null
  estado: EstadoSolicitud
  operador_id: string | null
  motivo_rechazo_cancelacion: string | null
  sla_horas: number | null
  sla_vence_en: string | null
  creado_en: string
  tipo_solicitud_id: string
  cliente: { nombre: string } | null
  tipo: { nombre: string } | null
  ubicacion: {
    nombre: string
    provincia: string
    canton: string
    distrito: string
    latitud: number | null
    longitud: number | null
  } | null
  ruta: { latitud: number | null; longitud: number | null } | null
  operador: { nombre_completo: string } | null
  solicitante: { nombre_completo: string } | null
  validacion: { satisfecho: boolean; comentario: string | null; validado_en: string } | null
  peticiones: {
    id: string
    tipo: 'cierre' | 'cancelacion'
    motivo: string
    estado: 'pendiente' | 'aprobada' | 'rechazada'
    creado_en: string
    comentario_resolucion: string | null
  }[]
}

export interface OperadorResumen {
  id: string
  nombre_completo: string
}

export interface MaterialSolicitud {
  id: string
  cantidad: number
  costo_referencial_aplicado: number | null
  creado_en: string
  material: { nombre: string; unidad_medida: string } | null
  registrado_por_usuario: { nombre_completo: string } | null
}

export interface MiSolicitud {
  id: string
  numero: number
  nombre: string
  detalle: string
  estado: string
  prioridad: string | null
  creado_en: string
  sla_vence_en: string | null
  /** Datos para modificar el borrador mientras está en "creada". */
  tipo_solicitud_id: string
  ubicacion_id: string | null
  equipo_id: string | null
  tipo: { nombre: string } | null
}

/** Fila de "Mis solicitudes" en el portal del Cliente: todas las solicitudes de su organización. */
export interface SolicitudPortalCliente extends MiSolicitud {
  cerrada_en: string | null
  garantia_vence_en: string | null
  operador: { nombre_completo: string } | null
  ubicacion: {
    nombre: string
    provincia: string
    canton: string
    distrito: string
    otras_senas: string | null
  } | null
  equipo: {
    nombre: string
    marca: string | null
    modelo: string | null
    serie: string | null
  } | null
  /** Si esta solicitud es una garantía: la solicitud original que reclama. */
  original: { numero: number; nombre: string } | null
  /** Garantías aplicadas sobre esta solicitud. */
  garantias: { numero: number; estado: string }[]
  /** Avances del operador con su reporte de atención (si lo generó). */
  avances: {
    creado_en: string
    reportes_atencion: {
      ruta_storage_pdf: string | null
      estado_equipo_final: 'funcionando' | 'parcial' | 'sin_funcionar'
      recomendaciones: string | null
      checklist_requiere_seguimiento: boolean
      creado_en: string
    } | null
  }[]
  validacion: {
    satisfecho: boolean
    comentario: string | null
    calificacion: number | null
    llego_a_tiempo: boolean | null
    recomendaria_tecnico: boolean | null
    validado_en: string
  } | null
}

/** Archivo adjunto de una solicitud (evidencia del Cliente o del operador). */
export type AdjuntoSolicitud = {
  id: string
  nombre_archivo: string
  ruta_storage: string
  mime_type: string
  subido_por: string
  creado_en: string
  url?: string
}

export type Comunicacion = {
  id: string
  solicitud_id: string
  tipo: 'mensaje' | 'proforma'
  asunto: string
  mensaje: string
  monto: number | null
  creado_en: string
  enviado_por: string
  remitente: { nombre_completo: string } | null
  adjuntos: {
    id: string
    nombre_archivo: string
    ruta_storage: string
    mime_type: string
    url?: string
  }[]
}
