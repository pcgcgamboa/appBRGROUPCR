import { createSupabaseClienteRepository } from '@/features/cliente/adapters/supabase-cliente-repository'
import type { ClienteRepository } from '@/features/cliente/ports/cliente-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `cliente`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso método a método (ver `createSupabaseClienteRepository`),
 * así que construir la instancia aquí no rompe el arranque de la app.
 */
export const clienteRepository: ClienteRepository = createSupabaseClienteRepository(supabase)
