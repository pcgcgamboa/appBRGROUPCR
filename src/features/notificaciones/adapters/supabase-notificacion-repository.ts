import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificacionRepository } from '@/features/notificaciones/ports/notificacion-repository'
import type { EnvioNotificacion } from '@/features/notificaciones/types/notificaciones.types'

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
    async envios(solicitudId?: string): Promise<EnvioNotificacion[]> {
      if (!client) return []
      const query = client
        .from('notificaciones_envios')
        .select('*')
        .order('creado_en', { ascending: false })
      const { data, error } = solicitudId
        ? await query.eq('solicitud_id', solicitudId).limit(10)
        : await query.limit(30)
      if (error) throw error
      return data as EnvioNotificacion[]
    },
  }
}
