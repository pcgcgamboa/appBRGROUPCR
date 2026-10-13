import { useMutation, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { AplicarGarantiaInput } from '@/features/solicitudes/ports/solicitud-repository'

export function useAplicarGarantia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AplicarGarantiaInput) => solicitudRepository.aplicarGarantia(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['tracking-cliente'] }),
        queryClient.invalidateQueries({ queryKey: ['tracking-solicitud'] }),
      ]),
  })
}
