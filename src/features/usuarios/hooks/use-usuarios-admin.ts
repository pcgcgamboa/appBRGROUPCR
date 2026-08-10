import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DatosUsuarioAdmin, UsuarioAdmin } from '@/features/usuarios/types/usuarios.types'

async function invocar(accion: string, usuario?: Partial<DatosUsuarioAdmin>) {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { accion, usuario },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { usuarios?: UsuarioAdmin[] }
}

export function useUsuariosAdmin() {
  const queryClient = useQueryClient()
  const usuarios = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await invocar('listar')).usuarios ?? [],
  })
  const guardar = useMutation({
    mutationFn: (usuario: DatosUsuarioAdmin) =>
      invocar(usuario.id ? 'actualizar' : 'crear', usuario),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const eliminar = useMutation({
    mutationFn: (id: string) => invocar('eliminar', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  return { usuarios, guardar, eliminar }
}
