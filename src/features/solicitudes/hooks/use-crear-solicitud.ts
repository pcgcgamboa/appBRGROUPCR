import { useMutation, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { CrearSolicitudInput } from '@/features/solicitudes/ports/solicitud-repository'

export function useCrearSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearSolicitudInput) => solicitudRepository.crear(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
      ]),
  })
}
