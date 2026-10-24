import { createSupabaseRecomendacionesRepository } from '@/features/recomendaciones/adapters/supabase-recomendaciones-repository'
import type { RecomendacionesRepository } from '@/features/recomendaciones/ports/recomendaciones-repository'
import { supabase } from '@/lib/supabase'

export const recomendacionesRepository: RecomendacionesRepository =
  createSupabaseRecomendacionesRepository(supabase)
