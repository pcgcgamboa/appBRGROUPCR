import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type NotificacionInterna = {
  id: number
  tipo: 'bolsa_empleo' | 'cliente'
  titulo: string
  mensaje: string
  entidad_tipo: string
  entidad_id: string
  creado_en: string
  lecturas: { usuario_id: string; leida_en: string }[]
}

export function useNotificacionesInternas() {
  return useQuery({
    queryKey: ['notificaciones-internas'],
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('notificaciones_internas')
        .select(
          'id,tipo,titulo,mensaje,entidad_tipo,entidad_id,creado_en,lecturas:notificaciones_internas_lecturas(usuario_id,leida_en)',
        )
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as NotificacionInterna[]
    },
  })
}

export function useCantidadNotificacionesPendientes() {
  const notificaciones = useNotificacionesInternas()
  return {
    ...notificaciones,
    cantidad: notificaciones.data?.filter((item) => !item.lecturas.length).length ?? 0,
  }
}

export function useMarcarNotificacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, leida }: { id: number; leida: boolean }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const consulta = leida
        ? supabase
            .from('notificaciones_internas_lecturas')
            .upsert({ notificacion_id: id, usuario_id: auth.user.id })
        : supabase
            .from('notificaciones_internas_lecturas')
            .delete()
            .eq('notificacion_id', id)
            .eq('usuario_id', auth.user.id)
      const { error } = await consulta
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones-internas'] }),
  })
}
