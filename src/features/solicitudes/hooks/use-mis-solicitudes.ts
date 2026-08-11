import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MiSolicitud {
  id: string
  numero: number
  nombre: string
  estado: string
  prioridad: string | null
  creado_en: string
  sla_vence_en: string | null
  tipo: { nombre: string } | null
}

export function useMisSolicitudes(usuarioId?: string) {
  return useQuery({
    queryKey: ['mis-solicitudes', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: async () => {
      if (!supabase || !usuarioId) throw new Error('No hay una sesión activa.')
      const { data, error } = await supabase
        .from('solicitudes')
        .select(
          'id, numero, nombre, estado, prioridad, creado_en, sla_vence_en, tipo:tipos_solicitud(nombre)',
        )
        .eq('solicitante_id', usuarioId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as MiSolicitud[]
    },
  })
}
