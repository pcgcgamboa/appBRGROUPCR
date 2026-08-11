import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { OperadorResumen } from '@/features/solicitudes/types/solicitudes.types'

export function useOperadores() {
  return useQuery({
    queryKey: ['operadores-activos'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, usuario_roles!inner(roles!inner(codigo))')
        .eq('activo', true)
        .eq('usuario_roles.roles.codigo', 'operador')
        .order('nombre_completo')
      if (error) throw error
      return data as unknown as OperadorResumen[]
    },
  })
}
