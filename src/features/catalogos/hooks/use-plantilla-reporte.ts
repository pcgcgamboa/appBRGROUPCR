import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogoRepository } from '@/features/catalogos/lib/repository'
import type { PlantillaReporte } from '@/features/catalogos/types/catalogos.types'

export function usePlantillaReporte(clienteId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['plantilla-reporte', clienteId]

  const plantilla = useQuery({
    queryKey,
    queryFn: () => catalogoRepository.obtenerPlantillaReporte(clienteId),
    staleTime: 5 * 60_000,
  })

  const guardar = useMutation({
    mutationFn: (input: PlantillaReporte) => catalogoRepository.guardarPlantillaReporte(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { plantilla, guardar }
}
