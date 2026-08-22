import { useQuery } from '@tanstack/react-query'
import { clienteRepository } from '@/features/cliente/lib/repository'

export function useTrackingCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['tracking-cliente', clienteId],
    enabled: Boolean(clienteId),
    queryFn: () => clienteRepository.tracking(clienteId),
  })
}
