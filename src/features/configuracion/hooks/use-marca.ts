import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { configuracionRepository } from '@/features/configuracion/lib/repository'
import type { ConfiguracionMarca } from '@/features/configuracion/types/configuracion.types'
import { marcaPredeterminada } from '@/features/configuracion/types/configuracion.types'

export type { ConfiguracionMarca }
export { marcaPredeterminada }

const queryKey = ['configuracion-marca']

export function useMarca() {
  return useQuery({
    queryKey,
    queryFn: () => configuracionRepository.obtenerMarca(),
    placeholderData: marcaPredeterminada,
    staleTime: 5 * 60_000,
  })
}

export function useActualizarMarca() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ logo, icono }: { logo?: File; icono?: File }) => {
      const actual = queryClient.getQueryData<ConfiguracionMarca>(queryKey) ?? marcaPredeterminada
      return configuracionRepository.actualizarMarca({ actual, logo, icono })
    },
    onSuccess: (marca) => queryClient.setQueryData(queryKey, marca),
  })
}
