import { useMutation } from '@tanstack/react-query'
import { useConfiguracionOperativa } from '@/features/configuracion/hooks/use-marca'
import { recomendacionesRepository } from '@/features/recomendaciones/lib/repository'
import type { RecomendarRutaInput } from '@/features/recomendaciones/types/recomendaciones.types'

// Mutaciones (no queries): la IA se consulta a demanda con un botón, no en cada render.

/** Tiempo máximo de una consulta a la IA, de Configuración → General (6 s por defecto). */
function useTiempoEsperaMs() {
  return (useConfiguracionOperativa().data?.ia_tiempo_espera_segundos ?? 6) * 1000
}

export function useRecomendarOperadorIa() {
  const tiempoEsperaMs = useTiempoEsperaMs()
  return useMutation({
    mutationFn: (solicitudId: string) =>
      recomendacionesRepository.operadorParaSolicitud(solicitudId, tiempoEsperaMs),
  })
}

export function useRecomendarSolicitudesRutaIa() {
  const tiempoEsperaMs = useTiempoEsperaMs()
  return useMutation({
    mutationFn: (input: RecomendarRutaInput) =>
      recomendacionesRepository.solicitudesParaRuta(input, tiempoEsperaMs),
  })
}
