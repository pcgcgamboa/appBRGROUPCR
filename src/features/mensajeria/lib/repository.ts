import { createSupabaseMensajeInternoRepository } from '@/features/mensajeria/adapters/supabase-mensaje-interno-repository'
import type { MensajeInternoRepository } from '@/features/mensajeria/ports/mensaje-interno-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `mensajeria`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso método a método, así que construir la instancia
 * aquí no rompe el arranque de la app.
 */
export const mensajeInternoRepository: MensajeInternoRepository =
  createSupabaseMensajeInternoRepository(supabase)
