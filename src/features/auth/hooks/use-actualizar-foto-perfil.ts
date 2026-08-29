import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authRepository } from '@/features/auth/lib/repository'

export function useActualizarFotoPerfil(usuarioId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (archivo: File) => {
      if (!usuarioId) throw new Error('No hay una sesión activa.')
      return authRepository.actualizarFoto(usuarioId, archivo)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['perfil-actual', usuarioId] }),
  })
}
