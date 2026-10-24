/** Origen de una recomendación: reglas locales (siempre disponibles) o Gemini (Edge Function). */
export type OrigenRecomendacion = 'reglas' | 'ia'

export interface RecomendacionOperador {
  operador_id: string
  nombre: string
  motivo: string
}

export interface RecomendacionSolicitud {
  solicitud_id: string
  motivo: string
}

export interface RecomendarRutaInput {
  fecha: string
  /** Último día de una ruta de varios días (null = un solo día). */
  fecha_fin: string | null
  seleccionadas: string[]
  responsable_id: string | null
  participantes: string[]
}
