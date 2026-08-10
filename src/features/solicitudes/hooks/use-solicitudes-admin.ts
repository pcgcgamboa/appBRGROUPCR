import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  EstadoSolicitud,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'

interface Intervencion {
  id: string
  operador_id: string | null
  estado: EstadoSolicitud
  motivo_rechazo_cancelacion: string | null
}

export function useSolicitudesAdmin() {
  const queryClient = useQueryClient()
  const solicitudes = useQuery({
    queryKey: ['solicitudes-admin'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('solicitudes')
        .select(
          'id, numero, nombre, prioridad, estado, operador_id, motivo_rechazo_cancelacion, cliente:clientes(nombre), operador:usuarios!solicitudes_operador_id_fkey(nombre_completo)',
        )
        .not('estado', 'in', '(cerrada,cancelada,rechazada)')
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudAdmin[]
    },
  })
  const intervenir = useMutation({
    mutationFn: async ({ id, ...values }: Intervencion) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { error } = await supabase.from('solicitudes').update(values).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
  })
  return { solicitudes, intervenir }
}
