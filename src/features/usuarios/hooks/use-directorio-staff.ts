import { useQuery } from '@tanstack/react-query'
import { directorioStaffRepository } from '@/features/usuarios/lib/repository'

/**
 * Lista de administrador/encargado/operador para el selector de "a quién
 * escribirle" de mensajería interna. Nunca incluye cliente/solicitante — lo
 * garantiza la política RLS `usuarios_lectura_directorio_staff`, no un
 * filtro en el cliente.
 */
export function useDirectorioStaff() {
  return useQuery({
    queryKey: ['directorio-staff'],
    staleTime: 5 * 60_000,
    queryFn: () => directorioStaffRepository.listar(),
  })
}
