import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

/** Camino principal de una solicitud; "en espera de materiales" se intercala solo si aplica. */
export const CAMINO_ESTADOS: EstadoSolicitud[] = [
  'creada',
  'enviada',
  'asignada',
  'en_atencion',
  'atendida',
  'cerrada',
]

export function etiquetaEstadoSolicitud(estado: EstadoSolicitud) {
  return estado === 'creada' ? 'borrador' : estado.replace(/_/g, ' ')
}

/** Posición en el flujo, para saber si un cambio avanza o retrocede. */
export function posicionEstado(estado: EstadoSolicitud) {
  if (estado === 'en_espera_materiales') return CAMINO_ESTADOS.indexOf('en_atencion') + 0.5
  return CAMINO_ESTADOS.indexOf(estado)
}
