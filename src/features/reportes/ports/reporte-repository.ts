import type {
  DashboardSolicitudes,
  ReporteCostosMateriales,
} from '@/features/reportes/types/reportes.types'

/**
 * Puerto del dominio `reportes`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-reporte-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface ReporteRepository {
  dashboardSolicitudes(): Promise<DashboardSolicitudes>
  costosMateriales(): Promise<ReporteCostosMateriales>
}
