import { useQuery } from '@tanstack/react-query'
import { notificacionRepository } from '@/features/notificaciones/lib/repository'

export function useEnviosNotificaciones(solicitudId?: string) {
  return useQuery({
    queryKey: ['envios-notificaciones', solicitudId ?? 'todas'],
    queryFn: () => notificacionRepository.envios(solicitudId),
  })
}
