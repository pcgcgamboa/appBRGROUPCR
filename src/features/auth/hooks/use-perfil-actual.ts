import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface PerfilActual {
  id: string
  nombre_completo: string
  roles: string[]
}

interface PerfilRespuesta {
  id: string
  nombre_completo: string
  usuario_roles: { roles: { codigo: string } | null }[]
}

export function usePerfilActual(usuarioId?: string) {
  return useQuery({
    queryKey: ['perfil-actual', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: async (): Promise<PerfilActual> => {
      if (!supabase || !usuarioId) throw new Error('No hay una sesión activa.')
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, usuario_roles(roles(codigo))')
        .eq('id', usuarioId)
        .single()
      if (error) throw error
      const perfil = data as unknown as PerfilRespuesta
      return {
        id: perfil.id,
        nombre_completo: perfil.nombre_completo,
        roles: perfil.usuario_roles.flatMap((item) =>
          item.roles?.codigo ? [item.roles.codigo] : [],
        ),
      }
    },
  })
}
