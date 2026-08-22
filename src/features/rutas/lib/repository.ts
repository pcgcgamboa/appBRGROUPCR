import { createSupabaseRutasRepository } from '@/features/rutas/adapters/supabase-rutas-repository'
import type { RutasRepository } from '@/features/rutas/ports/rutas-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `rutas`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso y lanza el error de configuración método a
 * método (ver `createSupabaseRutasRepository`), así que construir la
 * instancia aquí no rompe el arranque de la app.
 */
export const rutasRepository: RutasRepository = createSupabaseRutasRepository(supabase)
