import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  EnvioNotificacion,
  SolicitudNotificaciones,
} from '@/features/notificaciones/types/notificaciones.types'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

export function useConfiguracionNotificaciones() {
  return useQuery({
    queryKey: ['configuracion-notificaciones'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('solicitudes')
        .select(
          'id, numero, nombre, estado, cliente:clientes(nombre, email_contacto), notificaciones_config(estado, activa)',
        )
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudNotificaciones[]
    },
  })
}

export function useGuardarNotificacion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      solicitud_id,
      estado,
      activa,
    }: {
      solicitud_id: string
      estado: EstadoSolicitud
      activa: boolean
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await supabase.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const { error } = await supabase.from('notificaciones_config').upsert(
        {
          solicitud_id,
          estado,
          activa,
          configurado_por: auth.user.id,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: 'solicitud_id,estado' },
      )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['configuracion-notificaciones'] }),
  })
}

export function useEnviosNotificaciones(solicitudId?: string) {
  return useQuery({
    queryKey: ['envios-notificaciones', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: async () => {
      if (!supabase || !solicitudId) return []
      const { data, error } = await supabase
        .from('notificaciones_envios')
        .select('*')
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as EnvioNotificacion[]
    },
  })
}
