import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { AgregarMaterialInput } from '@/features/solicitudes/ports/solicitud-repository'

export type { MaterialSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export function useMaterialesSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['materiales-solicitud', solicitudId],
    queryFn: () => solicitudRepository.materiales(solicitudId),
  })
}

export function useAgregarMaterialSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AgregarMaterialInput) => solicitudRepository.agregarMaterial(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['materiales-solicitud', variables.solicitud_id],
        }),
        queryClient.invalidateQueries({ queryKey: ['reporte-costos-materiales'] }),
      ])
    },
  })
}
