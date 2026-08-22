import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type TrackingCliente = {
  id: number
  solicitud_id: string
  tipo: string
  titulo: string
  descripcion: string | null
  creado_en: string
  solicitud: { numero: number; nombre: string } | null
  actor: { nombre_completo: string } | null
}

export function useTrackingCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['tracking-cliente', clienteId],
    enabled: Boolean(clienteId),
    queryFn: async () => {
      if (!supabase || !clienteId) return []
      const { data: solicitudes, error: solicitudesError } = await supabase
        .from('solicitudes')
        .select('id')
        .eq('cliente_id', clienteId)
      if (solicitudesError) throw solicitudesError
      if (!solicitudes.length) return []
      const { data, error } = await supabase
        .from('solicitud_actividades')
        .select(
          'id,solicitud_id,tipo,titulo,descripcion,creado_en,solicitud:solicitudes(numero,nombre),actor:usuarios!solicitud_actividades_actor_id_fkey(nombre_completo)',
        )
        .in(
          'solicitud_id',
          solicitudes.map((x) => x.id),
        )
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as TrackingCliente[]
    },
  })
}
