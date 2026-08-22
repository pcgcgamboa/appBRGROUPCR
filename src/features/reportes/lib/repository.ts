import { createSupabaseReporteRepository } from '@/features/reportes/adapters/supabase-reporte-repository'
import type { ReporteRepository } from '@/features/reportes/ports/reporte-repository'
import { supabase } from '@/lib/supabase'

/**
 * Instancia por defecto del repositorio de `reportes`, cableada al cliente
 * Supabase de la app. `supabase` puede ser `null` cuando el entorno no tiene
 * configuradas las variables `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; el
 * adaptador tolera ese caso método a método (ver `createSupabaseReporteRepository`),
 * así que construir la instancia aquí no rompe el arranque de la app.
 */
export const reporteRepository: ReporteRepository = createSupabaseReporteRepository(supabase)
