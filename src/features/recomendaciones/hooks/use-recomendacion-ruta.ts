import { useState } from 'react'
import { useConfiguracionOperativa } from '@/features/configuracion/hooks/use-marca'
import { useRecomendarSolicitudesRutaIa } from '@/features/recomendaciones/hooks/use-recomendaciones'
import { recomendarSolicitudesRutaPorReglas } from '@/features/recomendaciones/lib/reglas'
import type { OrigenRecomendacion } from '@/features/recomendaciones/types/recomendaciones.types'
import type { SolicitudParaRuta } from '@/features/rutas/types/rutas.types'

/**
 * "Recomendar" en el formulario de ruta: marca en la lista las solicitudes sugeridas (id → motivo).
 * Con la IA habilitada consulta Gemini; si está apagada en Configuración → General, falla o no
 * devuelve nada, marca las sugeridas por reglas para que el botón siempre dé un resultado.
 */
export function useRecomendacionRuta({
  candidatas,
  seleccionadas,
  responsableId,
  participantes,
  fecha,
  fechaFin,
  rutaId,
}: {
  candidatas: SolicitudParaRuta[]
  seleccionadas: string[]
  responsableId: string
  participantes: string[]
  fecha: string
  fechaFin: string | null
  rutaId?: string
}) {
  const ia = useRecomendarSolicitudesRutaIa()
  const iaHabilitada = useConfiguracionOperativa().data?.ia_recomendaciones_activa ?? false
  const [resultado, setResultado] = useState<{
    recomendadas: Map<string, string>
    origen: OrigenRecomendacion
  } | null>(null)

  function porReglas() {
    const personas = [responsableId, ...participantes].filter(Boolean)
    return new Map(
      recomendarSolicitudesRutaPorReglas({
        candidatas,
        seleccionadas,
        personas,
        fecha,
        fechaFin,
        rutaId,
      }).map((item) => [item.solicitud_id, item.motivo]),
    )
  }

  async function recomendar() {
    if (!iaHabilitada) {
      setResultado({ recomendadas: porReglas(), origen: 'reglas' })
      return
    }
    try {
      const sugeridas = await ia.mutateAsync({
        fecha,
        fecha_fin: fechaFin,
        seleccionadas,
        responsable_id: responsableId || null,
        participantes,
      })
      setResultado(
        sugeridas.length
          ? {
              recomendadas: new Map(sugeridas.map((item) => [item.solicitud_id, item.motivo])),
              origen: 'ia',
            }
          : { recomendadas: porReglas(), origen: 'reglas' },
      )
    } catch {
      // El mensaje para el usuario queda en `error`; mientras tanto, las reglas.
      setResultado({ recomendadas: porReglas(), origen: 'reglas' })
    }
  }

  return {
    recomendar,
    recomendadas: resultado?.recomendadas ?? new Map<string, string>(),
    origen: resultado?.origen ?? null,
    consultando: ia.isPending,
    error: iaHabilitada ? ia.error : null,
    iaHabilitada,
  }
}
