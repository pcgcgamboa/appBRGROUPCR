import { useMutation, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { EditarSolicitudInput } from '@/features/solicitudes/ports/solicitud-repository'

export type { EditarSolicitudInput }

export function useEditarSolicitud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EditarSolicitudInput) => solicitudRepository.editarDatos(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
  })
}
