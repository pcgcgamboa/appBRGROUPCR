import { createSupabaseFlotaRepository } from '@/features/flota/adapters/supabase-flota-repository'
import type { FlotaRepository } from '@/features/flota/ports/flota-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `flota`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso y lanza el error de configuración método a
 * método (ver `createSupabaseFlotaRepository`), así que construir la
 * instancia aquí no rompe el arranque de la app.
 */
export const flotaRepository: FlotaRepository = createSupabaseFlotaRepository(supabase)
