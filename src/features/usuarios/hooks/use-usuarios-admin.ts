import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usuariosRepository } from '@/features/usuarios/lib/repository'
import type { DatosUsuarioAdmin } from '@/features/usuarios/types/usuarios.types'

export function useUsuariosAdmin() {
  const queryClient = useQueryClient()
  const usuarios = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usuariosRepository.listar(),
  })
  const guardar = useMutation({
    mutationFn: (usuario: DatosUsuarioAdmin) => usuariosRepository.guardar(usuario),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const eliminar = useMutation({
    mutationFn: (id: string) => usuariosRepository.eliminar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const cambiarClave = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usuariosRepository.cambiarClave({ id, password }),
  })
  return { usuarios, guardar, eliminar, cambiarClave }
}
