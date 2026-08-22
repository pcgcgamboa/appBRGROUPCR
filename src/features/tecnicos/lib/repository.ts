import { createSupabaseTecnicosRepository } from '@/features/tecnicos/adapters/supabase-tecnicos-repository'
import type { TecnicosRepository } from '@/features/tecnicos/ports/tecnicos-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `tecnicos`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso método a método (ver
 * `createSupabaseTecnicosRepository`), así que construir la instancia aquí
 * no rompe el arranque de la app.
 */
export const tecnicosRepository: TecnicosRepository = createSupabaseTecnicosRepository(supabase)
