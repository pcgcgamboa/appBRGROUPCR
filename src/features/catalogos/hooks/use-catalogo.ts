import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DatosFormulario, EntidadBase } from '@/features/catalogos/types/catalogos.types'

export function useCatalogo<T extends EntidadBase>(tabla: string) {
  const queryClient = useQueryClient()
  const queryKey = ['catalogo', tabla]

  const listado = useQuery({
    queryKey,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as T[]
    },
  })

  const guardar = useMutation({
    mutationFn: async ({ id, values }: { id?: string | number; values: DatosFormulario }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const consulta = id
        ? supabase.from(tabla).update(values).eq('id', id).select('id').single()
        : supabase.from(tabla).insert(values).select('id').single()
      const { data, error } = await consulta
      if (error) throw error
      return data.id as string | number
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const eliminar = useMutation({
    mutationFn: async (id: string | number) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { error } = await supabase.from(tabla).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { listado, guardar, eliminar }
}
