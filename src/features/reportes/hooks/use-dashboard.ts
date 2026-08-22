import { useQuery } from '@tanstack/react-query'
import { reporteRepository } from '@/features/reportes/lib/repository'

export function useDashboardSolicitudes() {
  return useQuery({
    queryKey: ['dashboard-solicitudes'],
    queryFn: () => reporteRepository.dashboardSolicitudes(),
    staleTime: 60_000,
  })
}

export function useReporteCostosMateriales() {
  return useQuery({
    queryKey: ['reporte-costos-materiales'],
    queryFn: () => reporteRepository.costosMateriales(),
    staleTime: 60_000,
  })
}
