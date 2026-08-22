import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ActividadRuta = {
  id: number
  tipo: string
  titulo: string
  descripcion: string | null
  creado_en: string
  actor: { nombre_completo: string } | null
}

export function useTrackingRuta(rutaId: string | null) {
  return useQuery({
    queryKey: ['tracking-ruta', rutaId],
    enabled: Boolean(rutaId),
    queryFn: async () => {
      if (!supabase || !rutaId) return []
      const { data, error } = await supabase
        .from('ruta_actividades')
        .select(
          'id,tipo,titulo,descripcion,creado_en,actor:usuarios!ruta_actividades_actor_id_fkey(nombre_completo)',
        )
        .eq('ruta_id', rutaId)
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
      if (error) throw error
      return data as unknown as ActividadRuta[]
    },
  })
}
