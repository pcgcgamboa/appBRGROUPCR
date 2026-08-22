import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tecnicosRepository } from '@/features/tecnicos/lib/repository'
import type { AsignarTecnicosInput } from '@/features/tecnicos/ports/tecnicos-repository'
export function useTecnicosSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['tecnicos-solicitud', solicitudId],
    queryFn: () => tecnicosRepository.tecnicosSolicitud(solicitudId),
  })
}
export function useAsignarTecnicos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AsignarTecnicosInput) => tecnicosRepository.asignarTecnicos(input),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['tecnicos-solicitud', v.solicitudId] }),
  })
}
