import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

interface GestionInput {
  accion: 'asignar' | 'cambiar_estado' | 'rechazar' | 'reabrir'
  solicitud_id: string
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  operador_id?: string
  estado?: EstadoSolicitud
  motivo?: string
}

export function useGestionarSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GestionInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase.functions.invoke('gestionar-solicitud', {
        body: input,
      })
      if (error) {
        const contexto = 'context' in error ? error.context : null
        if (contexto instanceof Response) {
          const detalle = (await contexto
            .clone()
            .json()
            .catch(() => null)) as { error?: string } | null
          if (detalle?.error) throw new Error(detalle.error)
        }
        throw error
      }
      if (data?.error) throw new Error(data.error as string)
      return data as { solicitud_id: string }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
      ])
    },
  })
}
