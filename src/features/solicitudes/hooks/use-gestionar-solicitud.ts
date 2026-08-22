import { useMutation, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { GestionInput } from '@/features/solicitudes/ports/solicitud-repository'

export function useGestionarSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GestionInput) => {
      if (input.accion === 'resolver_peticion') {
        if (!input.peticion_id || input.aprobar === undefined)
          throw new Error('La decisión de la petición es requerida.')
        return solicitudRepository.resolverPeticion({
          peticion_id: input.peticion_id,
          aprobar: input.aprobar,
          motivo: input.motivo,
        })
      }
      return solicitudRepository.gestionar(input)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
      ])
    },
  })
}
