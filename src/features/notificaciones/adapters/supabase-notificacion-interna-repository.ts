import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MarcarNotificacionInput,
  NotificacionInternaRepository,
} from '@/features/notificaciones/ports/notificacion-interna-repository'
import type { NotificacionInterna } from '@/features/notificaciones/types/notificaciones.types'

/**
 * Adaptador concreto de `NotificacionInternaRepository` sobre supabase-js.
 * Cada método verifica que el cliente esté configurado (`client` puede ser
 * `null` cuando las variables de entorno de Supabase no están presentes)
 * para no romper el arranque de la app — el chequeo se hace por método, no
 * al construir la instancia, replicando el patrón `if (!supabase) throw ...`
 * que ya usaban los hooks.
 */
export function createSupabaseNotificacionInternaRepository(
  client: SupabaseClient | null,
): NotificacionInternaRepository {
  return {
    async listar(): Promise<NotificacionInterna[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('notificaciones_internas')
        .select(
          'id,tipo,titulo,mensaje,entidad_tipo,entidad_id,creado_en,lecturas:notificaciones_internas_lecturas(usuario_id,leida_en)',
        )
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as NotificacionInterna[]
    },

    async marcar({ id, leida }: MarcarNotificacionInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const consulta = leida
        ? client
            .from('notificaciones_internas_lecturas')
            // `ignoreDuplicates` → ON CONFLICT DO NOTHING: la tabla solo otorga
            // select/insert/delete, y un DO UPDATE exigiría privilegio UPDATE.
            .upsert({ notificacion_id: id, usuario_id: auth.user.id }, { ignoreDuplicates: true })
        : client
            .from('notificaciones_internas_lecturas')
            .delete()
            .eq('notificacion_id', id)
            .eq('usuario_id', auth.user.id)
      const { error } = await consulta
      if (error) throw error
    },
  }
}
