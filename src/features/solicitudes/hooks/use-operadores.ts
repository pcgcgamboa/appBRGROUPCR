import { useQuery } from '@tanstack/react-query'
import { solicitudRepository } from '@/features/solicitudes/lib/repository'

export function useOperadores() {
  return useQuery({
    queryKey: ['operadores-activos'],
    queryFn: () => solicitudRepository.operadoresActivos(),
  })
}
