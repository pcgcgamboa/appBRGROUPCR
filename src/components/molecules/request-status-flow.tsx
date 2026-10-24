import { Check } from 'lucide-react'
import {
  CAMINO_ESTADOS,
  etiquetaEstadoSolicitud,
  posicionEstado,
} from '@/features/solicitudes/lib/estados'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'
import { cn } from '@/lib/utils'

/**
 * Flujo de estados de la solicitud con el actual resaltado: los anteriores aparecen completados y
 * los siguientes pendientes. Cancelada/rechazada se muestran aparte porque cortan el flujo.
 */
export function RequestStatusFlow({ estado }: { estado: EstadoSolicitud }) {
  const pasos: EstadoSolicitud[] =
    estado === 'en_espera_materiales'
      ? [...CAMINO_ESTADOS.slice(0, 4), 'en_espera_materiales', ...CAMINO_ESTADOS.slice(4)]
      : CAMINO_ESTADOS
  const terminal = estado === 'cancelada' || estado === 'rechazada'
  const actual = posicionEstado(estado)
  return (
    <div className="space-y-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label="Flujo de la solicitud">
        {pasos.map((paso, indice) => {
          const posicion = posicionEstado(paso)
          const esActual = paso === estado
          const completado = !terminal && posicion < actual
          return (
            <li key={paso} className="flex items-center gap-1">
              {indice > 0 && <span aria-hidden="true" className="h-px w-3 bg-border" />}
              <span
                aria-current={esActual ? 'step' : undefined}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-1 capitalize',
                  esActual && 'border-primary bg-primary font-semibold text-primary-foreground',
                  completado && 'border-primary/40 bg-primary-soft text-primary-soft-foreground',
                  !esActual && !completado && 'text-muted-foreground',
                )}
              >
                {completado && <Check className="size-3" aria-hidden="true" />}
                {etiquetaEstadoSolicitud(paso)}
              </span>
            </li>
          )
        })}
      </ol>
      {terminal && (
        <p className="text-xs font-medium capitalize text-destructive">
          Flujo terminado: {etiquetaEstadoSolicitud(estado)}
        </p>
      )}
    </div>
  )
}
