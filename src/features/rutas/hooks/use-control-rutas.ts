import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rutasRepository } from '@/features/rutas/lib/repository'
import type { ControlRutaInput } from '@/features/rutas/types/rutas.types'

export function useSolicitudesParaRuta() {
  return useQuery({
    queryKey: ['solicitudes-rutas'],
    queryFn: () => rutasRepository.solicitudesParaRuta(),
  })
}

export function useGuardarControlRuta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ControlRutaInput) => rutasRepository.guardarControlRuta(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-rutas'] }),
  })
}
