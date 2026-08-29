import { createSupabaseSeguimientoRepository } from '@/features/seguimiento/adapters/supabase-seguimiento-repository'
import { supabase } from '@/lib/supabase'
export const seguimientoRepository = createSupabaseSeguimientoRepository(supabase)
