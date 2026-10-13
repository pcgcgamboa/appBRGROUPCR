import { ClipboardCheck, Eye, History, ListChecks, MapPin, Send } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Skeleton } from '@/components/atoms/skeleton'
import { ConnectivityBanner } from '@/components/molecules/connectivity-banner'
import { PageHeader } from '@/components/molecules/page-header'
import { PanelCloseButton } from '@/components/molecules/panel-close-button'
import { OperatorProgressForm } from '@/components/organisms/operator-progress-form'
import { OperatorResolutionRequest } from '@/components/organisms/operator-resolution-request'
import { InternalRequestNotes } from '@/components/organisms/internal-request-notes'
import { ProgressHistory } from '@/components/organisms/progress-history'
import { RequestTechnicians } from '@/components/organisms/request-technicians'
import { RequestTimeline } from '@/components/organisms/request-timeline'
import { RequestServiceFollowUp } from '@/components/organisms/request-service-follow-up'
import {
  TechnicianRequestContext,
  TechnicianSelfService,
} from '@/components/organisms/technician-workspace'
import { marcarSolicitudAbierta } from '@/features/operador/hooks/use-avance-draft'
import { usePerfilTecnico, useSolicitudesOperador } from '@/features/operador/hooks/use-operador'
import type { SolicitudOperador } from '@/features/operador/types/operador.types'
import { normalizarError } from '@/lib/errores'

type ModoPanel = 'detalle' | 'avance'

export function OperadorPage({ usuarioId }: { usuarioId: string }) {
  const solicitudes = useSolicitudesOperador(usuarioId)
  const perfil = usePerfilTecnico(usuarioId)
  const [seleccionada, setSeleccionada] = useState<SolicitudOperador | null>(null)
  const [modo, setModo] = useState<ModoPanel>('detalle')
  const [trackingVisible, setTrackingVisible] = useState(false)
  const [peticionSeleccionada, setPeticionSeleccionada] = useState<SolicitudOperador | null>(null)
  const formularioRef = useRef<HTMLDivElement>(null)

  function abrirPanel(solicitud: SolicitudOperador, nuevoModo: ModoPanel) {
    setSeleccionada(solicitud)
    setModo(nuevoModo)
    setTrackingVisible(false)
    marcarSolicitudAbierta(nuevoModo === 'avance' ? solicitud.id : null)
    requestAnimationFrame(() =>
      formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  function cerrarDetalle() {
    setSeleccionada(null)
    setTrackingVisible(false)
    marcarSolicitudAbierta(null)
  }

  return (
    <section className="space-y-6">
      <ConnectivityBanner />
      <PageHeader
        title="Atención de servicios"
        description="Consulte la solicitud o registre el trabajo realizado desde el sitio de atención."
      />
      <TechnicianSelfService usuarioId={usuarioId} />
      {solicitudes.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(solicitudes.error).mensaje}
        </p>
      )}

      {seleccionada && (
        <section
          ref={formularioRef}
          aria-labelledby="panel-solicitud-titulo"
          className="scroll-mt-24 space-y-6 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-start justify-between gap-3 border-b border-primary/20 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Solicitud en gestión · {modo === 'detalle' ? 'Detalle' : 'Registro de avance'}
              </p>
              <h2 id="panel-solicitud-titulo" className="text-lg font-semibold">
                Solicitud #{seleccionada.numero}: {seleccionada.nombre}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {modo === 'detalle'
                  ? 'Consulte la información, el personal y el historial de esta solicitud.'
                  : 'Registre el trabajo realizado y los recursos utilizados.'}
              </p>
            </div>
            <PanelCloseButton onClose={cerrarDetalle} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {modo === 'avance' ? (
              <OperatorProgressForm
                solicitud={seleccionada}
                operadorNombre={perfil.data?.nombre_completo ?? ''}
                onSaved={cerrarDetalle}
                onCancel={cerrarDetalle}
              />
            ) : (
              <article className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{seleccionada.cliente?.nombre}</p>
                    <h3 className="text-lg font-semibold">{seleccionada.nombre}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{seleccionada.estado.replace(/_/g, ' ')}</Badge>
                    <Badge>{seleccionada.prioridad ?? 'Sin prioridad'}</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Descripción</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {seleccionada.detalle}
                  </p>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  {seleccionada.ruta ? (
                    <span>
                      {seleccionada.ruta.provincia}, {seleccionada.ruta.canton},{' '}
                      {seleccionada.ruta.distrito}
                      <br />
                      {seleccionada.ruta.otras_senas}
                    </span>
                  ) : (
                    <span className="text-warning">Control de ruta pendiente</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {seleccionada.estado !== 'atendida' && (
                    <Button onClick={() => abrirPanel(seleccionada, 'avance')}>
                      <ClipboardCheck className="mr-2 size-4" />
                      Registrar avance
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setTrackingVisible((actual) => !actual)}>
                    <History className="mr-2 size-4" />
                    {trackingVisible ? 'Cerrar seguimiento' : 'Consultar seguimiento'}
                  </Button>
                </div>
              </article>
            )}
            <div className="space-y-6">
              <RequestTechnicians solicitudId={seleccionada.id} />
              <ProgressHistory
                solicitudId={seleccionada.id}
                solicitud={seleccionada}
                operadorNombre={perfil.data?.nombre_completo ?? ''}
              />
            </div>
          </div>
          {modo === 'detalle' && (
            <div className="space-y-6">
              <TechnicianRequestContext solicitudId={seleccionada.id} />
              <RequestServiceFollowUp solicitudId={seleccionada.id} modo="gestor" />
              <section className="space-y-3 rounded-xl border bg-card p-4">
                <h3 className="font-semibold">Notas internas</h3>
                <InternalRequestNotes solicitudId={seleccionada.id} />
              </section>
            </div>
          )}
          {modo === 'detalle' && trackingVisible && (
            <RequestTimeline solicitudId={seleccionada.id} />
          )}
        </section>
      )}

      <section
        aria-labelledby="lista-solicitudes-titulo"
        className="space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-card text-primary shadow-sm">
              <ListChecks className="size-5" />
            </span>
            <div>
              <h2 id="lista-solicitudes-titulo" className="font-semibold">
                Solicitudes asignadas
              </h2>
              <p className="text-sm text-muted-foreground">
                Seleccione una solicitud para consultar su detalle o registrar un avance.
              </p>
            </div>
          </div>
          {!solicitudes.isLoading && (
            <Badge variant="default">{solicitudes.data?.length ?? 0} solicitudes</Badge>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {solicitudes.isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-32" />
              </div>
            ))}
          {solicitudes.data?.map((solicitud) => (
            <article
              key={solicitud.id}
              className={
                seleccionada?.id === solicitud.id
                  ? 'rounded-lg border-2 border-primary bg-card p-4 shadow-sm'
                  : 'rounded-lg border bg-card p-4 shadow-sm'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Solicitud #{solicitud.numero}</p>
                  <h2 className="font-semibold">{solicitud.nombre}</h2>
                  <p className="mt-1 text-sm">{solicitud.cliente?.nombre}</p>
                </div>
                <Badge>{solicitud.prioridad ?? 'Sin prioridad'}</Badge>
              </div>
              {seleccionada?.id === solicitud.id && (
                <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                  Abierta en {modo === 'detalle' ? 'detalle' : 'registro de avance'}
                </p>
              )}
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{solicitud.detalle}</p>
              <div className="mt-3 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                {solicitud.ruta ? (
                  <span>
                    {solicitud.ruta.provincia}, {solicitud.ruta.canton}, {solicitud.ruta.distrito}
                    <br />
                    {solicitud.ruta.otras_senas}
                  </span>
                ) : (
                  <span className="text-warning">Control de ruta pendiente</span>
                )}
              </div>
              {solicitud.peticiones.some((peticion) => peticion.estado === 'pendiente') ? (
                <p className="mt-4 rounded-lg bg-warning-soft p-3 text-sm font-medium text-warning-soft-foreground">
                  Petición de{' '}
                  {solicitud.peticiones.find((item) => item.estado === 'pendiente')?.tipo} pendiente
                  de aprobación.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => abrirPanel(solicitud, 'detalle')}>
                    <Eye className="mr-2 size-4" />
                    Ver solicitud
                  </Button>
                  {solicitud.estado !== 'atendida' && (
                    <Button onClick={() => abrirPanel(solicitud, 'avance')}>
                      <ClipboardCheck className="mr-2 size-4" />
                      Registrar avance
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setPeticionSeleccionada(solicitud)}>
                    <Send className="mr-2 size-4" />
                    Solicitar{' '}
                    {solicitud.estado === 'atendida' ? 'cierre o cancelación' : 'cancelación'}
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
        {!solicitudes.isLoading && !solicitudes.data?.length && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No tiene solicitudes pendientes de atención.
          </p>
        )}
      </section>
      {peticionSeleccionada && (
        <OperatorResolutionRequest
          solicitud={peticionSeleccionada}
          onClose={() => setPeticionSeleccionada(null)}
        />
      )}
    </section>
  )
}
