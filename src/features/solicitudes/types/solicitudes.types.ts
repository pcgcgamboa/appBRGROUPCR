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
  operador: { nombre_completo: string } | null
}

export interface OperadorResumen {
  id: string
  nombre_completo: string
}
