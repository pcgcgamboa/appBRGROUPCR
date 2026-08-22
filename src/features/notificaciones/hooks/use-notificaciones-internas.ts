import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificacionInternaRepository } from '@/features/notificaciones/lib/repository'

export type { NotificacionInterna } from '@/features/notificaciones/types/notificaciones.types'

export function useNotificacionesInternas() {
  return useQuery({
    queryKey: ['notificaciones-internas'],
    refetchInterval: 30_000,
    queryFn: () => notificacionInternaRepository.listar(),
  })
}

export function useCantidadNotificacionesPendientes() {
  const notificaciones = useNotificacionesInternas()
  return {
    ...notificaciones,
    cantidad: notificaciones.data?.filter((item) => !item.lecturas.length).length ?? 0,
  }
}

export function useMarcarNotificacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, leida }: { id: number; leida: boolean }) =>
      notificacionInternaRepository.marcar({ id, leida }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones-internas'] }),
  })
}
