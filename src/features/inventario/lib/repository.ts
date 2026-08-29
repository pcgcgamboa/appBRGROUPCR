import { createSupabaseInventarioRepository } from '@/features/inventario/adapters/supabase-inventario-repository'
import { supabase } from '@/lib/supabase'
export const inventarioRepository = createSupabaseInventarioRepository(supabase)
