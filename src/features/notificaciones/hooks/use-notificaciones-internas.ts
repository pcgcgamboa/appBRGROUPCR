import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificacionInternaRepository } from '@/features/notificaciones/lib/repository'
import type { NotificacionInterna } from '@/features/notificaciones/types/notificaciones.types'

export type { NotificacionInterna } from '@/features/notificaciones/types/notificaciones.types'

const queryKey = ['notificaciones-internas']

export function useNotificacionesInternas() {
  return useQuery({
    queryKey,
    refetchInterval: 30_000,
    // Sin esto TanStack pausa el sondeo con la pestaña oculta y el contador del menú
    // no refleja notificaciones nuevas hasta que el usuario vuelve a la pestaña.
    refetchIntervalInBackground: true,
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
    // Actualización optimista: el contador del menú y la tarjeta cambian al instante.
    onMutate: async ({ id, leida }) => {
      await qc.cancelQueries({ queryKey })
      const anterior = qc.getQueryData<NotificacionInterna[]>(queryKey)
      qc.setQueryData<NotificacionInterna[]>(queryKey, (actual) =>
        actual?.map((item) =>
          item.id === id
            ? {
                ...item,
                lecturas: leida ? [{ usuario_id: '', leida_en: new Date().toISOString() }] : [],
              }
            : item,
        ),
      )
      return { anterior }
    },
    onError: (_error, _variables, contexto) => {
      if (contexto?.anterior) qc.setQueryData(queryKey, contexto.anterior)
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })
}
