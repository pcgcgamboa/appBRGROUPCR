import { useQuery } from '@tanstack/react-query'
import { flotaRepository } from '@/features/flota/lib/repository'
import type { ActividadRuta } from '@/features/flota/types/flota.types'

export type { ActividadRuta }

export function useTrackingRuta(rutaId: string | null) {
  return useQuery({
    queryKey: ['tracking-ruta', rutaId],
    enabled: Boolean(rutaId),
    queryFn: () => flotaRepository.trackingRuta(rutaId ?? ''),
  })
}
