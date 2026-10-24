import type {
  MiSolicitud,
  SolicitudPortalCliente,
} from '@/features/solicitudes/types/solicitudes.types'

/** La garantía se puede aplicar solo sobre una solicitud cerrada con garantía vigente. */
export function garantiaVigente(solicitud: SolicitudPortalCliente) {
  return (
    solicitud.estado === 'cerrada' &&
    Boolean(solicitud.garantia_vence_en && new Date(solicitud.garantia_vence_en) >= new Date())
  )
}

/** Nombre del estado para el Cliente: "creada" es su borrador (aún no enviado al proveedor). */
export function etiquetaEstado(estado: string) {
  return estado === 'creada' ? 'borrador' : estado.replace(/_/g, ' ')
}

const FINALIZADAS = ['cerrada', 'cancelada', 'rechazada']

/** Solicitud de garantía abierta sobre esta solicitud (la base de datos admite una a la vez). */
export function garantiaEnCurso(solicitud: SolicitudPortalCliente) {
  return solicitud.garantias.find((garantia) => !FINALIZADAS.includes(garantia.estado)) ?? null
}

/** Solo se archivan solicitudes finalizadas (la RLS de solicitudes_archivadas exige lo mismo). */
export function puedeArchivar(solicitud: Pick<MiSolicitud, 'estado'>) {
  return FINALIZADAS.includes(solicitud.estado)
}

export function estaArchivada(solicitud: Pick<MiSolicitud, 'archivo'>) {
  return solicitud.archivo.length > 0
}

export function puedeAplicarGarantia(solicitud: SolicitudPortalCliente) {
  return garantiaVigente(solicitud) && !garantiaEnCurso(solicitud)
}

export function pendienteDeEvaluar(solicitud: SolicitudPortalCliente) {
  return solicitud.estado === 'cerrada' && !solicitud.validacion
}

export function rutaReporte(solicitud: SolicitudPortalCliente) {
  return solicitud.avances.find((avance) => avance.reportes_atencion?.ruta_storage_pdf)
    ?.reportes_atencion?.ruta_storage_pdf
}

export function descripcionEquipo(equipo: SolicitudPortalCliente['equipo']) {
  if (!equipo) return null
  return [equipo.nombre, equipo.marca, equipo.modelo].filter(Boolean).join(' · ')
}
