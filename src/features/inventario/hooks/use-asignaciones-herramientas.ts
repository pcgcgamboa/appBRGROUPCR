import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventarioRepository } from '@/features/inventario/lib/repository'
import type {
  AsignarHerramientaInput,
  DevolverHerramientaInput,
} from '@/features/inventario/types/inventario.types'
const key = ['asignaciones-herramientas']
export function useGestionHerramientas() {
  const queryClient = useQueryClient()
  const herramientas = useQuery({
    queryKey: ['herramientas-inventario'],
    queryFn: () => inventarioRepository.herramientas(),
  })
  const personas = useQuery({
    queryKey: ['personas-inventario'],
    queryFn: () => inventarioRepository.personas(),
  })
  const asignaciones = useQuery({
    queryKey: key,
    queryFn: () => inventarioRepository.asignaciones(),
  })
  const asignar = useMutation({
    mutationFn: (input: AsignarHerramientaInput) => inventarioRepository.asignar(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
  const devolver = useMutation({
    mutationFn: (input: DevolverHerramientaInput) => inventarioRepository.devolver(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
  return { herramientas, personas, asignaciones, asignar, devolver }
}
