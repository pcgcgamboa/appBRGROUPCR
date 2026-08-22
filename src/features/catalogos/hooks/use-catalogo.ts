import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogoRepository } from '@/features/catalogos/lib/repository'
import type { DatosFormulario, EntidadBase } from '@/features/catalogos/types/catalogos.types'

export function useCatalogo<T extends EntidadBase>(tabla: string) {
  const queryClient = useQueryClient()
  const queryKey = ['catalogo', tabla]

  const listado = useQuery({
    queryKey,
    queryFn: () => catalogoRepository.listar<T>(tabla),
  })

  const guardar = useMutation({
    mutationFn: ({ id, values }: { id?: string | number; values: DatosFormulario }) =>
      catalogoRepository.guardar(tabla, id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const eliminar = useMutation({
    mutationFn: (id: string | number) => catalogoRepository.eliminar(tabla, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { listado, guardar, eliminar }
}
