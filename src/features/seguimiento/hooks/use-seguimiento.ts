import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { seguimientoRepository } from '@/features/seguimiento/lib/repository'
import type { GarantiaInput, VisitaInput } from '@/features/seguimiento/types/seguimiento.types'

export function useSeguimientoSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['seguimiento-solicitud', solicitudId],
    queryFn: () => seguimientoRepository.obtener(solicitudId),
  })
}
export function useAgregarGarantia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GarantiaInput) => seguimientoRepository.agregarGarantia(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: ['seguimiento-solicitud', input.solicitud_id] }),
  })
}
export function useProgramarVisita() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VisitaInput) => seguimientoRepository.programarVisita(input),
    onSuccess: (_, input) =>
      queryClient.invalidateQueries({ queryKey: ['seguimiento-solicitud', input.solicitud_id] }),
  })
}
