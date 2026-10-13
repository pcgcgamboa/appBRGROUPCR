import { Activity, ChevronDown, FileText, ShieldCheck, Star } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { PanelCloseButton } from '@/components/molecules/panel-close-button'
import { RequestTimeline } from '@/components/organisms/request-timeline'
import {
  garantiaEnCurso,
  garantiaVigente,
  pendienteDeEvaluar,
  puedeAplicarGarantia,
  rutaReporte,
} from '@/features/solicitudes/lib/portal-cliente'
import type { SolicitudPortalCliente } from '@/features/solicitudes/types/solicitudes.types'

const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })
const soloFecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' })

/** Texto de la garantía con la razón cuando no se puede aplicar. */
function estadoGarantia(solicitud: SolicitudPortalCliente) {
  const enCurso = garantiaEnCurso(solicitud)
  if (enCurso) return `Hay una solicitud de garantía en curso: #${enCurso.numero}.`
  if (solicitud.estado !== 'cerrada') return 'Disponible cuando el proveedor cierre la solicitud.'
  if (!solicitud.garantia_vence_en) return 'Esta solicitud no tiene garantía registrada.'
  const vence = soloFecha.format(new Date(solicitud.garantia_vence_en))
  return garantiaVigente(solicitud) ? `Vigente hasta ${vence}.` : `Vencida el ${vence}.`
}

function estadoEvaluacion(solicitud: SolicitudPortalCliente) {
  const validacion = solicitud.validacion
  if (validacion)
    return `${validacion.satisfecho ? 'Satisfecho' : 'No satisfecho'}${
      validacion.calificacion ? ` · ${validacion.calificacion}/5` : ''
    }${validacion.comentario ? ` — ${validacion.comentario}` : ''}`
  return solicitud.estado === 'cerrada'
    ? 'Pendiente: puede evaluar el servicio.'
    : 'Disponible cuando el proveedor cierre la solicitud.'
}

function Dato({
  etiqueta,
  children,
  className,
}: {
  etiqueta: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

/**
 * Complemento de "Ver detalle" en el portal del Cliente, debajo del formulario de solo lectura con
 * los datos que el Cliente registró: estado de la atención, garantía, evaluación y seguimiento.
 */
export function ClientRequestDetail({
  solicitud,
  onEvaluar,
  onAplicarGarantia,
  onVerReporte,
}: {
  solicitud: SolicitudPortalCliente
  onEvaluar: () => void
  onAplicarGarantia: () => void
  onVerReporte: (rutaStorage: string) => void
}) {
  const reporte = rutaReporte(solicitud)
  const [verSeguimiento, setVerSeguimiento] = useState(false)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div className="space-y-3">
          <h3 className="font-semibold">Atención de la solicitud</h3>
          <dl className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Dato etiqueta="Operador asignado">{solicitud.operador?.nombre_completo ?? '—'}</Dato>
            <Dato etiqueta="Enviada / creada">{fecha.format(new Date(solicitud.creado_en))}</Dato>
            <Dato etiqueta="Fecha límite de atención">
              {solicitud.sla_vence_en ? fecha.format(new Date(solicitud.sla_vence_en)) : '—'}
            </Dato>
            <Dato etiqueta="Cerrada">
              {solicitud.cerrada_en ? fecha.format(new Date(solicitud.cerrada_en)) : '—'}
            </Dato>
            {solicitud.original && (
              <Dato etiqueta="Garantía de" className="sm:col-span-2">
                Solicitud #{solicitud.original.numero} · {solicitud.original.nombre}
              </Dato>
            )}
            {solicitud.garantias.length > 0 && (
              <Dato etiqueta="Garantías aplicadas" className="sm:col-span-2 xl:col-span-3">
                {solicitud.garantias
                  .map((garantia) => `#${garantia.numero} (${garantia.estado.replace(/_/g, ' ')})`)
                  .join(', ')}
              </Dato>
            )}
          </dl>
        </div>
        <aside className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div>
            <p className="text-sm font-semibold">Garantía</p>
            <p className="text-sm text-muted-foreground">{estadoGarantia(solicitud)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Evaluación</p>
            <p className="text-sm text-muted-foreground">{estadoEvaluacion(solicitud)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              aria-expanded={verSeguimiento}
              aria-controls={`seguimiento-${solicitud.id}`}
              onClick={() => setVerSeguimiento((actual) => !actual)}
            >
              <Activity className="mr-2 size-4" />
              Seguimiento
              <ChevronDown
                className={
                  verSeguimiento
                    ? 'ml-2 size-4 rotate-180 transition-transform'
                    : 'ml-2 size-4 transition-transform'
                }
              />
            </Button>
            {pendienteDeEvaluar(solicitud) && (
              <Button className="min-h-11" onClick={onEvaluar}>
                <Star className="mr-2 size-4" />
                Evaluar servicio
              </Button>
            )}
            {puedeAplicarGarantia(solicitud) && (
              <Button variant="outline" className="min-h-11" onClick={onAplicarGarantia}>
                <ShieldCheck className="mr-2 size-4" />
                Aplicar garantía
              </Button>
            )}
            {reporte && (
              <Button variant="outline" className="min-h-11" onClick={() => onVerReporte(reporte)}>
                <FileText className="mr-2 size-4" />
                Ver reporte de atención
              </Button>
            )}
          </div>
        </aside>
      </div>
      {verSeguimiento && (
        <section
          id={`seguimiento-${solicitud.id}`}
          className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Activity className="size-4 text-primary" />
                Seguimiento de la solicitud #{solicitud.numero}
              </h3>
              <p className="text-sm text-muted-foreground">
                Cambios de estado, avances, mensajes, proformas y garantía de esta solicitud.
              </p>
            </div>
            <PanelCloseButton onClose={() => setVerSeguimiento(false)} label="Cerrar seguimiento" />
          </div>
          <RequestTimeline solicitudId={solicitud.id} vistaCliente />
        </section>
      )}
    </div>
  )
}
