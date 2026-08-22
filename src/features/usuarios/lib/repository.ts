import { createSupabaseUsuariosRepository } from '@/features/usuarios/adapters/supabase-usuarios-repository'
import type { UsuariosRepository } from '@/features/usuarios/ports/usuarios-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `usuarios`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso método a método (ver
 * `createSupabaseUsuariosRepository`), así que construir la instancia aquí
 * no rompe el arranque de la app.
 */
export const usuariosRepository: UsuariosRepository = createSupabaseUsuariosRepository(supabase)
