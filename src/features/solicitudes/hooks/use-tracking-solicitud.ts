import { useQuery } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'

export function useTrackingSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['tracking-solicitud', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: () => solicitudRepository.tracking(solicitudId),
  })
}
