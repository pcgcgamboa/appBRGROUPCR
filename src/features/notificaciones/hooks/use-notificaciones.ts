import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificacionRepository } from '@/features/notificaciones/lib/repository'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export function useConfiguracionNotificaciones() {
  return useQuery({
    queryKey: ['configuracion-notificaciones'],
    queryFn: () => notificacionRepository.configuracion(),
  })
}

export function useGuardarNotificacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      solicitud_id,
      estado,
      activa,
    }: {
      solicitud_id: string
      estado: EstadoSolicitud
      activa: boolean
    }) => notificacionRepository.guardar({ solicitud_id, estado, activa }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['configuracion-notificaciones'] }),
  })
}

export function useEnviosNotificaciones(solicitudId?: string) {
  return useQuery({
    queryKey: ['envios-notificaciones', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: () => notificacionRepository.envios(solicitudId),
  })
}
