import { useQuery } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'

export type { MiSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export function useMisSolicitudes(usuarioId?: string) {
  return useQuery({
    queryKey: ['mis-solicitudes', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: () => solicitudRepository.misSolicitudes(usuarioId),
  })
}
