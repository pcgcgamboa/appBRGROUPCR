import { createSupabaseCatalogoRepository } from '@/features/catalogos/adapters/supabase-catalogo-repository'
import type { CatalogoRepository } from '@/features/catalogos/ports/catalogo-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `catalogos`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso método a método (ver
 * `createSupabaseCatalogoRepository`), así que construir la instancia aquí
 * no rompe el arranque de la app.
 */
export const catalogoRepository: CatalogoRepository = createSupabaseCatalogoRepository(supabase)
