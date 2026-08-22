import { createSupabaseNotificacionInternaRepository } from '@/features/notificaciones/adapters/supabase-notificacion-interna-repository'
import { createSupabaseNotificacionRepository } from '@/features/notificaciones/adapters/supabase-notificacion-repository'
import type { NotificacionInternaRepository } from '@/features/notificaciones/ports/notificacion-interna-repository'
import type { NotificacionRepository } from '@/features/notificaciones/ports/notificacion-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancias por defecto de los repositorios de `notificaciones`, cableadas
 * al cliente Supabase de la app. `supabase` puede ser `null` cuando el
 * entorno no tiene configuradas las variables
 * `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; los adaptadores toleran ese
 * caso método a método (ver `createSupabaseNotificacionInternaRepository` y
 * `createSupabaseNotificacionRepository`), así que construir las instancias
 * aquí no rompe el arranque de la app.
 */
export const notificacionInternaRepository: NotificacionInternaRepository =
  createSupabaseNotificacionInternaRepository(supabase)

export const notificacionRepository: NotificacionRepository =
  createSupabaseNotificacionRepository(supabase)
