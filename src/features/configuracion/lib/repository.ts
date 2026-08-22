import { createSupabaseConfiguracionRepository } from '@/features/configuracion/adapters/supabase-configuracion-repository'
import type { ConfiguracionRepository } from '@/features/configuracion/ports/configuracion-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `configuracion`, cableada al
 * cliente Supabase de la app. `supabase` puede ser `null` cuando el entorno
 * no tiene configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`;
 * el adaptador tolera ese caso método a método (ver
 * `createSupabaseConfiguracionRepository`), así que construir la instancia
 * aquí no rompe el arranque de la app.
 */
export const configuracionRepository: ConfiguracionRepository =
  createSupabaseConfiguracionRepository(supabase)
