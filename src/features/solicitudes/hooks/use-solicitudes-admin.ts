import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'
import type { Intervencion } from '@/features/solicitudes/ports/solicitud-repository'

export function useSolicitudesAdmin() {
  const queryClient = useQueryClient()
  const solicitudes = useQuery({
    queryKey: ['solicitudes-admin'],
    queryFn: () => solicitudRepository.listarAdmin(),
  })
  const intervenir = useMutation({
    mutationFn: (input: Intervencion) => solicitudRepository.intervenir(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
  })
  return { solicitudes, intervenir }
}
