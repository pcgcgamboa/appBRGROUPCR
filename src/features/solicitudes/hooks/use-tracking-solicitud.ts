import { useQuery } from '@tanstack/react-query'
import type { ActividadSolicitud } from '@/features/solicitudes/types/tracking.types'
import { supabase } from '@/lib/supabase'

export function useTrackingSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['tracking-solicitud', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('solicitud_actividades')
        .select(
          'id, solicitud_id, tipo, titulo, descripcion, datos, creado_en, actor:usuarios!solicitud_actividades_actor_id_fkey(nombre_completo)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
        .order('id', { ascending: false })
      if (error) throw error
      return data as unknown as ActividadSolicitud[]
    },
  })
}
