import { useQuery } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'

export function useSolicitudesOriginalesDisponibles(
  clienteId: string | null,
  equipoId: string | null,
) {
  return useQuery({
    queryKey: ['solicitudes-originales-disponibles', clienteId, equipoId],
    enabled: Boolean(clienteId && equipoId),
    queryFn: () => solicitudRepository.solicitudesOriginalesDisponibles(clienteId!, equipoId!),
  })
}
