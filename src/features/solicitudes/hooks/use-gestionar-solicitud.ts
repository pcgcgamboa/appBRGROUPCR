import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

interface GestionInput {
  accion: 'asignar' | 'cambiar_estado' | 'rechazar' | 'reabrir' | 'resolver_peticion'
  solicitud_id: string
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente'
  operador_id?: string
  estado?: EstadoSolicitud
  motivo?: string
  peticion_id?: string
  aprobar?: boolean
}

export function useGestionarSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: GestionInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      if (input.accion === 'resolver_peticion') {
        if (!input.peticion_id || input.aprobar === undefined)
          throw new Error('La decisión de la petición es requerida.')
        const { data, error } = await supabase.rpc('resolver_peticion_solicitud', {
          p_peticion_id: input.peticion_id,
          p_aprobar: input.aprobar,
          p_comentario: input.motivo || null,
        })
        if (error) throw error
        return { solicitud_id: data as string }
      }
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
