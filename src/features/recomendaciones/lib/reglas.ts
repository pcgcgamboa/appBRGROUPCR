import type { SolicitudParaRuta } from '@/features/rutas/types/rutas.types'
import type {
  OperadorResumen,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'
import type {
  RecomendacionOperador,
  RecomendacionSolicitud,
} from '@/features/recomendaciones/types/recomendaciones.types'

// Alternativa manual (sin IA) a `recomendar-ia`: puntajes simples y explicables, calculados con los
// datos que la pantalla ya tiene. Siempre disponible; también es el respaldo cuando Gemini no está
// configurado o falla.

const ESTADOS_ACTIVOS = ['asignada', 'en_atencion', 'en_espera_materiales']
const PESO_PRIORIDAD = { urgente: 15, alta: 10, media: 5, baja: 0 } as const

interface Punto {
  latitud: number | null
  longitud: number | null
}

/** Distancia aproximada en km (haversine); null si falta alguna coordenada. */
export function distanciaKm(a: Punto | null | undefined, b: Punto | null | undefined) {
  if (a?.latitud == null || a.longitud == null || b?.latitud == null || b.longitud == null)
    return null
  const rad = (grados: number) => (grados * Math.PI) / 180
  const dLat = rad(b.latitud - a.latitud)
  const dLng = rad(b.longitud - a.longitud)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/**
 * Operador sugerido para una solicitud: menor carga activa, experiencia en el mismo tipo y
 * cercanía (ya atiende algo en el mismo distrito/cantón). Devuelve los 3 mejores.
 */
export function recomendarOperadoresPorReglas(
  solicitud: SolicitudAdmin,
  solicitudes: SolicitudAdmin[],
  operadores: OperadorResumen[],
): RecomendacionOperador[] {
  return operadores
    .map((operador) => {
      const propias = solicitudes.filter(
        (item) => item.operador_id === operador.id && item.id !== solicitud.id,
      )
      const activas = propias.filter((item) => ESTADOS_ACTIVOS.includes(item.estado))
      const experiencia = propias.filter(
        (item) =>
          item.tipo_solicitud_id === solicitud.tipo_solicitud_id &&
          ['atendida', 'cerrada'].includes(item.estado),
      ).length
      const mismoDistrito = activas.filter(
        (item) =>
          solicitud.ubicacion &&
          item.ubicacion?.distrito === solicitud.ubicacion.distrito &&
          item.ubicacion.canton === solicitud.ubicacion.canton,
      ).length
      const mismoCanton = activas.filter(
        (item) => solicitud.ubicacion && item.ubicacion?.canton === solicitud.ubicacion.canton,
      ).length
      const puntaje =
        -8 * activas.length +
        Math.min(experiencia, 5) * 5 +
        (mismoDistrito ? 15 : mismoCanton ? 10 : 0)
      const motivos = [
        activas.length === 0 ? 'sin trabajo activo' : `${activas.length} solicitud(es) activa(s)`,
        experiencia ? `${experiencia} atendida(s) del mismo tipo` : null,
        mismoDistrito
          ? 'ya atiende en el mismo distrito'
          : mismoCanton
            ? 'ya atiende en el mismo cantón'
            : null,
      ].filter(Boolean)
      return {
        operador_id: operador.id,
        nombre: operador.nombre_completo,
        motivo: motivos.join(' · '),
        puntaje,
      }
    })
    .sort((a, b) => b.puntaje - a.puntaje || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 3)
    .map((item) => ({ operador_id: item.operador_id, nombre: item.nombre, motivo: item.motivo }))
}

/**
 * Solicitudes sugeridas para una ruta (puede durar varios días: `fecha` a `fechaFin`). Criterios,
 * cada uno con su motivo visible:
 *   - cercanía a las ya incluidas (coordenadas, o mismo distrito/cantón);
 *   - mismo operador: asignada a una persona de la ruta o al operador de otra ya incluida;
 *   - fechas ya definidas: programada dentro de los días de la ruta (resta si cae fuera);
 *   - coincidencias: misma empresa cliente que otra ya incluida;
 *   - prioridad y plazo (vencido o que vence antes de terminar la ruta).
 * Excluye las que ya están en otra ruta.
 */
export function recomendarSolicitudesRutaPorReglas({
  candidatas,
  seleccionadas,
  personas,
  fecha,
  fechaFin = null,
  rutaId,
  maximo = 6,
}: {
  candidatas: SolicitudParaRuta[]
  seleccionadas: string[]
  /** Responsable y participantes de la ruta. */
  personas: string[]
  fecha: string
  /** Último día de la ruta; null = solo `fecha`. */
  fechaFin?: string | null
  rutaId?: string
  maximo?: number
}): RecomendacionSolicitud[] {
  const elegidas = candidatas.filter((item) => seleccionadas.includes(item.id))
  const fin = fechaFin && fechaFin >= fecha ? fechaFin : fecha
  const finDia = new Date(`${fin}T23:59:59`)
  const operadoresElegidas = new Set(elegidas.map((item) => item.operador_id).filter(Boolean))
  const clientesElegidas = new Map(elegidas.map((item) => [item.cliente_id, item.numero]))
  return candidatas
    .filter(
      (item) =>
        !seleccionadas.includes(item.id) &&
        ESTADOS_ACTIVOS.includes(item.estado) &&
        (!item.ruta_proceso || item.ruta_proceso.ruta_id === rutaId),
    )
    .map((item) => {
      const motivos: string[] = []
      let puntaje = 0
      if (item.operador_id && personas.includes(item.operador_id)) {
        puntaje += 20
        motivos.push('asignada a una persona de la ruta')
      } else if (item.operador_id && operadoresElegidas.has(item.operador_id)) {
        puntaje += 15
        motivos.push('mismo operador que otras de la ruta')
      }
      const programada = item.programacion?.fecha_programada
      if (programada && programada >= fecha && programada <= fin) {
        puntaje += 20
        motivos.push(`programada para el ${programada}`)
      } else if (programada) {
        puntaje -= 10
        motivos.push(`programada para otro día (${programada})`)
      }
      const mismoCliente = clientesElegidas.get(item.cliente_id)
      if (mismoCliente) {
        puntaje += 15
        motivos.push(`mismo cliente que #${mismoCliente}`)
      }
      const cercania = Math.min(
        ...elegidas.map((otra) => distanciaKm(item.ubicacion, otra.ubicacion) ?? Infinity),
      )
      const mismoDistrito = elegidas.some(
        (otra) =>
          otra.ubicacion?.distrito === item.ubicacion?.distrito &&
          otra.ubicacion?.canton === item.ubicacion?.canton,
      )
      const mismoCanton = elegidas.some((otra) => otra.ubicacion?.canton === item.ubicacion?.canton)
      if (mismoDistrito || cercania <= 5) {
        puntaje += 20
        motivos.push(
          Number.isFinite(cercania)
            ? `a ${cercania.toFixed(1)} km de la ruta`
            : 'mismo distrito que la ruta',
        )
      } else if (mismoCanton || cercania <= 15) {
        puntaje += 12
        motivos.push(
          Number.isFinite(cercania) ? `a ${cercania.toFixed(1)} km de la ruta` : 'mismo cantón',
        )
      }
      if (item.prioridad && PESO_PRIORIDAD[item.prioridad]) {
        puntaje += PESO_PRIORIDAD[item.prioridad]
        motivos.push(`prioridad ${item.prioridad}`)
      }
      if (item.sla_vence_en && new Date(item.sla_vence_en) <= finDia) {
        puntaje += 10
        motivos.push(
          new Date(item.sla_vence_en) < new Date() ? 'plazo vencido' : 'vence durante la ruta',
        )
      }
      return { solicitud_id: item.id, motivo: motivos.join(' · ') || 'disponible', puntaje }
    })
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, maximo)
    .map((item) => ({ solicitud_id: item.solicitud_id, motivo: item.motivo }))
}
