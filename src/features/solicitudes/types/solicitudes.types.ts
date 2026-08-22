export type EstadoSolicitud =
  | 'creada'
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
  estado: string
  prioridad: string | null
  creado_en: string
  sla_vence_en: string | null
  tipo: { nombre: string } | null
}

export type Comunicacion = {
  id: string
  solicitud_id: string
  tipo: 'mensaje' | 'proforma'
  asunto: string
  mensaje: string
  monto: number | null
  creado_en: string
  remitente: { nombre_completo: string } | null
  adjuntos: {
    id: string
    nombre_archivo: string
    ruta_storage: string
    mime_type: string
    url?: string
  }[]
}
