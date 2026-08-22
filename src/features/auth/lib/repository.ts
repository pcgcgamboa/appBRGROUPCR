import { createSupabaseAuthRepository } from '@/features/auth/adapters/supabase-auth-repository'
import type { AuthRepository } from '@/features/auth/ports/auth-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `auth`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso método a método (ver `createSupabaseAuthRepository`),
 * así que construir la instancia aquí no rompe el arranque de la app.
 */
export const authRepository: AuthRepository = createSupabaseAuthRepository(supabase)
