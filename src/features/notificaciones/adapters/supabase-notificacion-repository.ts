import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  GuardarNotificacionInput,
  NotificacionRepository,
} from '@/features/notificaciones/ports/notificacion-repository'
import type {
  EnvioNotificacion,
  SolicitudNotificaciones,
} from '@/features/notificaciones/types/notificaciones.types'

/**
 * Adaptador concreto de `NotificacionRepository` sobre supabase-js. Cada
 * método verifica que el cliente esté configurado (`client` puede ser `null`
 * cuando las variables de entorno de Supabase no están presentes) para no
 * romper el arranque de la app — el chequeo se hace por método, no al
 * construir la instancia, replicando el patrón `if (!supabase) throw ...`
 * que ya usaban los hooks.
 */
export function createSupabaseNotificacionRepository(
  client: SupabaseClient | null,
): NotificacionRepository {
  return {
    async configuracion(): Promise<SolicitudNotificaciones[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('solicitudes')
        .select(
          'id, numero, nombre, estado, cliente:clientes(nombre, email_contacto), notificaciones_config(estado, activa)',
        )
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudNotificaciones[]
    },

    async guardar({ solicitud_id, estado, activa }: GuardarNotificacionInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const { error } = await client.from('notificaciones_config').upsert(
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

    async envios(solicitudId?: string): Promise<EnvioNotificacion[]> {
      if (!client || !solicitudId) return []
      const { data, error } = await client
        .from('notificaciones_envios')
        .select('*')
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as EnvioNotificacion[]
    },
  }
}
