import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { whatsappRepository } from '@/features/whatsapp/lib/repository'
import type {
  DestinatarioWhatsapp,
  EnviarWhatsappInput,
} from '@/features/whatsapp/types/whatsapp.types'

export function useSubirAdjuntoWhatsapp() {
  return useMutation({
    mutationFn: ({
      destinatarioTipo,
      destinatarioId,
      archivo,
    }: {
      destinatarioTipo: DestinatarioWhatsapp
      destinatarioId: string
      archivo: File
    }) => whatsappRepository.subirAdjunto(destinatarioTipo, destinatarioId, archivo),
  })
}

export function useEnviarWhatsapp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EnviarWhatsappInput) => whatsappRepository.enviar(input),
    onSuccess: (_data, input) =>
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-envios', input.destinatario_tipo, input.destinatario_id],
      }),
  })
}

export function useEnviosWhatsapp(destinatarioTipo: DestinatarioWhatsapp, destinatarioId: string) {
  return useQuery({
    queryKey: ['whatsapp-envios', destinatarioTipo, destinatarioId],
    queryFn: () => whatsappRepository.envios(destinatarioTipo, destinatarioId),
  })
}
