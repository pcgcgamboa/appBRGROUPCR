import { createSupabaseSolicitudRepository } from '@/features/solicitudes/adapters/supabase-solicitud-repository'
import type { SolicitudRepository } from '@/features/solicitudes/ports/solicitud-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `solicitudes`, cableada al
 * cliente Supabase de la app. `supabase` puede ser `null` cuando el entorno
 * no tiene configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`;
 * el adaptador tolera ese caso y lanza el error de configuración método a
 * método (ver `createSupabaseSolicitudRepository`), así que construir la
 * instancia aquí no rompe el arranque de la app.
 */
export const solicitudRepository: SolicitudRepository = createSupabaseSolicitudRepository(supabase)
