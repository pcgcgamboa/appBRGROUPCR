import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { EditarBorradorInput } from '@/features/solicitudes/ports/solicitud-repository'
import type { AdjuntoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

/** Ubicación reportada en la última solicitud del equipo, para precargarla al elegirlo. */
export function useUltimaUbicacionEquipo(equipoId: string | null) {
  return useQuery({
    queryKey: ['ultima-ubicacion-equipo', equipoId],
    enabled: Boolean(equipoId),
    queryFn: () => solicitudRepository.ultimaUbicacionEquipo(equipoId ?? ''),
  })
}

/** Adjuntos de una solicitud (p. ej. al modificar un borrador). */
export function useAdjuntosSolicitud(solicitudId: string | undefined) {
  return useQuery({
    queryKey: ['adjuntos-solicitud', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: () => solicitudRepository.adjuntos(solicitudId ?? ''),
  })
}

export function useEliminarAdjunto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (adjunto: AdjuntoSolicitud) => solicitudRepository.eliminarAdjunto(adjunto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adjuntos-solicitud'] }),
  })
}

function useInvalidarSolicitudes() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
      queryClient.invalidateQueries({ queryKey: ['adjuntos-solicitud'] }),
      queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
      queryClient.invalidateQueries({ queryKey: ['tracking-cliente'] }),
      queryClient.invalidateQueries({ queryKey: ['tracking-solicitud'] }),
    ])
}

/** Portal del Cliente: envía el borrador al proveedor ("creada" → "enviada"). */
export function useEnviarSolicitud() {
  const invalidar = useInvalidarSolicitudes()
  return useMutation({
    mutationFn: (solicitudId: string) => solicitudRepository.enviarSolicitud(solicitudId),
    onSuccess: invalidar,
  })
}

/** Portal del Cliente: modifica un borrador mientras sigue en "creada". */
export function useEditarBorrador() {
  const invalidar = useInvalidarSolicitudes()
  return useMutation({
    mutationFn: (input: EditarBorradorInput) => solicitudRepository.editarBorrador(input),
    onSuccess: invalidar,
  })
}
