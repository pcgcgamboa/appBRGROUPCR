import { useMutation } from '@tanstack/react-query'
import { authRepository } from '@/features/auth/lib/repository'

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authRepository.iniciarSesion(email, password),
  })
}
