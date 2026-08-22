import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { EnviarComunicacionInput } from '@/features/solicitudes/ports/solicitud-repository'

export type { Comunicacion } from '@/features/solicitudes/types/solicitudes.types'

export function useComunicacionesSolicitud(solicitudId?: string) {
  return useQuery({
    queryKey: ['comunicaciones-solicitud', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: () => solicitudRepository.comunicaciones(solicitudId),
  })
}

export function useEnviarComunicacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EnviarComunicacionInput) => solicitudRepository.enviarComunicacion(input),
    onSuccess: (solicitudId) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['comunicaciones-solicitud', solicitudId] }),
        qc.invalidateQueries({ queryKey: ['tracking-solicitud', solicitudId] }),
        qc.invalidateQueries({ queryKey: ['tracking-cliente'] }),
      ]),
  })
}
