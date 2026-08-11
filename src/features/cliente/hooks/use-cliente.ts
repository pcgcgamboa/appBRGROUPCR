import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SolicitudCliente } from '@/features/cliente/types/cliente.types'

export function useSolicitudesCliente(clienteId?: string | null) {
  return useQuery({
    queryKey: ['solicitudes-cliente', clienteId],
    enabled: Boolean(clienteId),
    queryFn: async () => {
      if (!supabase || !clienteId) return []
      const { data, error } = await supabase
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, estado, atendida_en, cerrada_en, tipo:tipos_solicitud(nombre), operador:usuarios!solicitudes_operador_id_fkey(nombre_completo), validacion:validaciones_cierre(satisfecho, comentario, validado_en)',
        )
        .eq('cliente_id', clienteId)
        .in('estado', ['atendida', 'cerrada'])
        .order('atendida_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudCliente[]
    },
  })
}

export function useValidarAtencion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      solicitud_id,
      satisfecho,
      comentario,
    }: {
      solicitud_id: string
      satisfecho: boolean
      comentario: string
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const { error } = await supabase.from('validaciones_cierre').upsert(
        {
          solicitud_id,
          cliente_usuario_id: auth.user.id,
          satisfecho,
          comentario: comentario.trim() || null,
          validado_en: new Date().toISOString(),
        },
        { onConflict: 'solicitud_id' },
      )
      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitudes-cliente'] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
      ])
    },
  })
}
