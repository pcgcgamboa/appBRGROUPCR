import { useQuery } from '@tanstack/react-query'
import { authRepository } from '@/features/auth/lib/repository'
import type { PerfilActual } from '@/features/auth/types/auth.types'

export function usePerfilActual(usuarioId?: string) {
  return useQuery({
    queryKey: ['perfil-actual', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: async (): Promise<PerfilActual> => {
      if (!usuarioId) throw new Error('No hay una sesión activa.')
      return authRepository.obtenerPerfil(usuarioId)
    },
  })
}
