import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DashboardSolicitudes } from '@/features/reportes/types/reportes.types'

export function useDashboardSolicitudes() {
  return useQuery({
    queryKey: ['dashboard-solicitudes'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase.rpc('obtener_dashboard_solicitudes')
      if (error) throw error
      return data as DashboardSolicitudes
    },
    staleTime: 60_000,
  })
}
