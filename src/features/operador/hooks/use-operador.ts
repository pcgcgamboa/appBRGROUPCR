import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { operadorRepository } from '@/features/operador/lib/repository'
import type {
  ActualizarPerfilTecnicoInput,
  RegistrarAvanceInput,
} from '@/features/operador/types/operador.types'

export function usePerfilTecnico(usuarioId?: string) {
  return useQuery({
    queryKey: ['perfil-tecnico', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: () => operadorRepository.perfilTecnico(usuarioId!),
  })
}

export function useActualizarPerfilTecnico() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ActualizarPerfilTecnicoInput) =>
      operadorRepository.actualizarPerfilTecnico(input),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['perfil-tecnico', variables.usuario_id] }),
  })
}

export function useHerramientasTecnico(usuarioId?: string) {
  return useQuery({
    queryKey: ['herramientas-tecnico', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: () => operadorRepository.herramientasTecnico(usuarioId!),
  })
}

export function useContextoSolicitudTecnico(solicitudId?: string) {
  return useQuery({
    queryKey: ['contexto-solicitud-tecnico', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: () => operadorRepository.contextoSolicitudTecnico(solicitudId!),
  })
}

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
