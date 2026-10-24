import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecomendacionesRepository } from '@/features/recomendaciones/ports/recomendaciones-repository'
import type {
  RecomendacionOperador,
  RecomendacionSolicitud,
} from '@/features/recomendaciones/types/recomendaciones.types'

async function invocar<T>(
  client: SupabaseClient | null,
  body: Record<string, unknown>,
  tiempoEsperaMs: number,
) {
  if (!client) throw new Error('Supabase no está configurado.')
  // Configuración → General: pasado el tiempo máximo se cancela la consulta.
  const control = new AbortController()
  const temporizador = setTimeout(() => control.abort(), tiempoEsperaMs)
  const segundos = Math.round(tiempoEsperaMs / 1000)
  let respuesta: Awaited<ReturnType<typeof client.functions.invoke>>
  try {
    respuesta = await client.functions.invoke('recomendar-ia', { body, signal: control.signal })
  } catch (error) {
    if (control.signal.aborted)
      throw new Error(`La recomendación con IA tardó más de ${segundos} s y se canceló.`)
    throw error
  } finally {
    clearTimeout(temporizador)
  }
  const { data, error } = respuesta
  if (error && control.signal.aborted)
    throw new Error(`La recomendación con IA tardó más de ${segundos} s y se canceló.`)
  if (error) {
    // El cuerpo de la respuesta trae el mensaje real (p. ej. "falta GEMINI_API_KEY").
    const contexto = 'context' in error ? error.context : null
    if (contexto instanceof Response) {
      const detalle = (await contexto
        .clone()
        .json()
        .catch(() => null)) as { error?: string } | null
      if (detalle?.error) throw new Error(detalle.error)
    }
    throw error
  }
  return (data as { recomendaciones: T[] }).recomendaciones
}

export function createSupabaseRecomendacionesRepository(
  client: SupabaseClient | null,
): RecomendacionesRepository {
  return {
    operadorParaSolicitud: (solicitudId, tiempoEsperaMs) =>
      invocar<RecomendacionOperador>(
        client,
        { modo: 'operador', solicitud_id: solicitudId },
        tiempoEsperaMs,
      ),
    solicitudesParaRuta: (input, tiempoEsperaMs) =>
      invocar<RecomendacionSolicitud>(client, { modo: 'ruta', ...input }, tiempoEsperaMs),
  }
}
