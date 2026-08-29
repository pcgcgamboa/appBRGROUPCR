import { createSupabaseProformasRepository } from '@/features/proformas/adapters/supabase-proformas-repository'
import { supabase } from '@/lib/supabase'
export const proformasRepository = createSupabaseProformasRepository(supabase)
