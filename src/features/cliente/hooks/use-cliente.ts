import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clienteRepository } from '@/features/cliente/lib/repository'
import type { ValidarAtencionInput } from '@/features/cliente/ports/cliente-repository'

export function useSolicitudesCliente(clienteId?: string | null) {
  return useQuery({
    queryKey: ['solicitudes-cliente', clienteId],
    enabled: Boolean(clienteId),
    queryFn: () => clienteRepository.solicitudesAtendidas(clienteId),
  })
}

export function useValidarAtencion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ValidarAtencionInput) => clienteRepository.validarAtencion(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitudes-cliente'] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
      ])
    },
  })
}
