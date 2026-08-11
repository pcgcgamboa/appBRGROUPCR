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
