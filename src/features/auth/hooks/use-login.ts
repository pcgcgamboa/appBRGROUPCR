import { useMutation } from '@tanstack/react-query'
import { authRepository } from '@/features/auth/lib/repository'

export function useLogin() {
  return useMutation({
    mutationFn: ({ cuenta, password }: { cuenta: string; password: string }) =>
      authRepository.iniciarSesion(cuenta, password),
  })
}
