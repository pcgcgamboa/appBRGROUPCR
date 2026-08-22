import { useMutation } from '@tanstack/react-query'
import { authRepository } from '@/features/auth/lib/repository'

export function useLogout() {
  return useMutation({
    mutationFn: () => authRepository.cerrarSesion(),
  })
}
