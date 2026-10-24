import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'

export type { MiSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export function useMisSolicitudes(usuarioId?: string, enabled = true) {
  return useQuery({
    queryKey: ['mis-solicitudes', usuarioId],
    enabled: enabled && Boolean(usuarioId),
    queryFn: () => solicitudRepository.misSolicitudes(usuarioId),
  })
}

/**
 * Portal del Cliente: todas las solicitudes de su organización (también las que un gestor creó en
 * su nombre). Comparte el prefijo `mis-solicitudes` para que crear una solicitud lo refresque.
 */
export function useSolicitudesPortalCliente(clienteId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['mis-solicitudes', 'cliente', clienteId],
    enabled: enabled && Boolean(clienteId),
    queryFn: () => solicitudRepository.solicitudesPortalCliente(clienteId ?? ''),
  })
}

/** Archiva o desarchiva una solicitud finalizada para el usuario actual (no afecta a otros). */
export function useArchivarSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { solicitudId: string; archivada: boolean }) =>
      solicitudRepository.archivar(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
  })
}
