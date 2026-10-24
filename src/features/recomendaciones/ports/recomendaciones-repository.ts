import type {
  RecomendacionOperador,
  RecomendacionSolicitud,
  RecomendarRutaInput,
} from '@/features/recomendaciones/types/recomendaciones.types'

/** Recomendaciones con IA (Gemini vía la Edge Function `recomendar-ia`). `tiempoEsperaMs`: pasado
 * ese plazo la consulta se cancela y se rechaza con un mensaje para el usuario. */
export interface RecomendacionesRepository {
  operadorParaSolicitud(
    solicitudId: string,
    tiempoEsperaMs: number,
  ): Promise<RecomendacionOperador[]>
  solicitudesParaRuta(
    input: RecomendarRutaInput,
    tiempoEsperaMs: number,
  ): Promise<RecomendacionSolicitud[]>
}
