import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { operadorRepository } from '@/features/operador/lib/repository'
import type { RegistrarAvanceInput } from '@/features/operador/types/operador.types'

export function useSolicitudesOperador(usuarioId?: string) {
  return useQuery({
    queryKey: ['solicitudes-operador', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: () => operadorRepository.solicitudesOperador(usuarioId!),
  })
}

export function useSolicitarResolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      solicitud_id,
      tipo,
      motivo,
    }: {
      solicitud_id: string
      tipo: 'cierre' | 'cancelacion'
      motivo: string
    }) => operadorRepository.solicitarResolucion({ solicitud_id, tipo, motivo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-operador'] }),
  })
}

export function useAvancesSolicitud(solicitudId?: string) {
  return useQuery({
    queryKey: ['avances-operador', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: () => operadorRepository.avancesSolicitud(solicitudId!),
  })
}

export function useRegistrarAvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegistrarAvanceInput) => operadorRepository.registrarAvance(input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitudes-operador'] }),
        queryClient.invalidateQueries({ queryKey: ['avances-operador', variables.solicitud_id] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
      ])
    },
  })
}
