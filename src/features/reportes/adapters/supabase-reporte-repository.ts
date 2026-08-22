import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReporteRepository } from '@/features/reportes/ports/reporte-repository'
import type {
  DashboardSolicitudes,
  ReporteCostosMateriales,
} from '@/features/reportes/types/reportes.types'

/**
 * Adaptador concreto de `ReporteRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) throw ...` que ya usaban
 * los hooks.
 */
export function createSupabaseReporteRepository(client: SupabaseClient | null): ReporteRepository {
  return {
    async dashboardSolicitudes(): Promise<DashboardSolicitudes> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.rpc('obtener_dashboard_solicitudes')
      if (error) throw error
      return data as DashboardSolicitudes
    },

    async costosMateriales(): Promise<ReporteCostosMateriales> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.rpc('obtener_reporte_costos_materiales')
      if (error) throw error
      return data as ReporteCostosMateriales
    },
  }
}
