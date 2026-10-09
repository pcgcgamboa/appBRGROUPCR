import {
  ClipboardCheck,
  FilePlus2,
  FileText,
  FolderOpen,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { Suspense, useState } from 'react'
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { CargandoRuta } from '@/components/molecules/cargando-ruta'
import { PageHeader } from '@/components/molecules/page-header'
import { DisclosurePanel } from '@/components/molecules/disclosure-panel'
import { ClientValidationForm } from '@/components/organisms/client-validation-form'
import { ClientTracking } from '@/components/organisms/client-tracking'
import { ClientDocumentsManager } from '@/components/organisms/client-documents-manager'
import { RequestServiceFollowUp } from '@/components/organisms/request-service-follow-up'
import { SolicitantePage } from '@/components/pages/solicitante/solicitante-page'
import {
  useSolicitudesCliente,
  useUrlFirmadaReporteCliente,
} from '@/features/cliente/hooks/use-cliente'
import type { SolicitudCliente } from '@/features/cliente/types/cliente.types'
import { normalizarError } from '@/lib/errores'
import { useI18n } from '@/lib/i18n'

type ClienteRouteContext = { usuarioId: string; clienteId: string }

const SECCIONES = ['solicitudes', 'documentos', 'tracking', 'validaciones'] as const
type Seccion = (typeof SECCIONES)[number]

export function ClientePage({
  usuarioId,
  clienteId,
}: {
  usuarioId: string
  clienteId: string | null
}) {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const seccion: Seccion =
    SECCIONES.find((candidata) => location.pathname.endsWith(`/${candidata}`)) ?? 'solicitudes'

  if (!clienteId)
    return (
      <p
        role="alert"
        className="rounded-md bg-warning-soft p-4 text-sm text-warning-soft-foreground"
      >
        Su usuario necesita estar asociado a un cliente.
      </p>
    )

  return (
    <Tabs
      value={seccion}
      onValueChange={(value) => navigate(`/cliente/${value}`)}
      className="space-y-6"
    >
      <TabsList className="w-fit" aria-label={t('serviceValidation')}>
        <TabsTrigger value="solicitudes">
          <FilePlus2 className="mr-2 size-4" />
          {t('myRequests')}
        </TabsTrigger>
        <TabsTrigger value="documentos">
          <FolderOpen className="mr-2 size-4" />
          Documentos
        </TabsTrigger>
        <TabsTrigger value="tracking">
          <MessageSquare className="mr-2 size-4" />
          Tracking
        </TabsTrigger>
        <TabsTrigger value="validaciones">
          <ClipboardCheck className="mr-2 size-4" />
          {t('serviceValidation')}
        </TabsTrigger>
      </TabsList>
      <Suspense fallback={<CargandoRuta />}>
        <Outlet context={{ usuarioId, clienteId } satisfies ClienteRouteContext} />
      </Suspense>
    </Tabs>
  )
}

export function ClienteSolicitudesRoute() {
  const { usuarioId, clienteId } = useOutletContext<ClienteRouteContext>()
  return <SolicitantePage usuarioId={usuarioId} clienteId={clienteId} />
}

export function ClienteDocumentosRoute() {
  const { clienteId } = useOutletContext<ClienteRouteContext>()
  return <ClientDocumentsManager clienteId={clienteId} clienteNombre="Mi organización" canUpload />
}

export function ClienteTrackingRoute() {
  const { clienteId } = useOutletContext<ClienteRouteContext>()
  return <ClientTracking clienteId={clienteId} />
}

export function ClienteValidacionesRoute() {
  const { clienteId } = useOutletContext<ClienteRouteContext>()
  const solicitudes = useSolicitudesCliente(clienteId)
  const [seleccionada, setSeleccionada] = useState<SolicitudCliente | null>(null)
  return (
    <ValidacionesCliente
      solicitudes={solicitudes}
      seleccionada={seleccionada}
      setSeleccionada={setSeleccionada}
    />
  )
}

function ValidacionesCliente({
  solicitudes,
  seleccionada,
  setSeleccionada,
}: {
  solicitudes: ReturnType<typeof useSolicitudesCliente>
  seleccionada: SolicitudCliente | null
  setSeleccionada: (solicitud: SolicitudCliente | null) => void
}) {
  const urlReporte = useUrlFirmadaReporteCliente()

  async function verReporte(rutaStorage: string) {
    // Abre la pestaña dentro del gesto del clic y la redirige después de resolver la URL firmada
    // — esperar el async primero perdería el gesto de usuario y el navegador bloquearía el popup.
    const ventana = window.open('', '_blank')
    const url = await urlReporte.mutateAsync(rutaStorage)
    if (ventana) ventana.location.href = url
  }

  return (
    <section className="space-y-6">
      <div>
        <PageHeader
          title="Validación de servicios"
          description="Indique su satisfacción o comentarios para completar el cierre."
        />
      </div>
      {solicitudes.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(solicitudes.error).mensaje}
        </p>
      )}
      {seleccionada && (
        <ClientValidationForm solicitud={seleccionada} onSaved={() => setSeleccionada(null)} />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {solicitudes.data?.map((solicitud) => (
          <article key={solicitud.id} className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Solicitud #{solicitud.numero}</p>
                <h2 className="font-semibold">{solicitud.nombre}</h2>
                <p className="mt-1 text-sm">{solicitud.tipo?.nombre}</p>
              </div>
              <Badge>{solicitud.estado}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Operador: {solicitud.operador?.nombre_completo ?? '—'}
            </p>
            {(() => {
              const rutaPdf = solicitud.avances.find(
                (avance) => avance.reportes_atencion?.ruta_storage_pdf,
              )?.reportes_atencion?.ruta_storage_pdf
              return (
                rutaPdf && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    disabled={urlReporte.isPending}
                    onClick={() => verReporte(rutaPdf)}
                  >
                    <FileText className="mr-2 size-4" />
                    Ver reporte de atención
                  </Button>
                )
              )
            })()}
            <div className="mt-4">
              <DisclosurePanel
                icon={ShieldCheck}
                title="Garantía, llegada y equipo"
                description="Consulte la llegada, las personas asignadas o solicite atención por garantía."
              >
                <RequestServiceFollowUp solicitudId={solicitud.id} modo="cliente" />
              </DisclosurePanel>
            </div>{' '}
            {solicitud.validacion ? (
              <div className="mt-4 rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground">
                <p className="font-medium">
                  Validación enviada:{' '}
                  {solicitud.validacion.satisfecho ? 'Satisfecho' : 'No satisfecho'}
                </p>
                {solicitud.validacion.comentario && (
                  <p className="mt-1">{solicitud.validacion.comentario}</p>
                )}
              </div>
            ) : solicitud.estado === 'atendida' ? (
              <Button className="mt-4" onClick={() => setSeleccionada(solicitud)}>
                <MessageSquare className="mr-2 size-4" />
                Validar atención
              </Button>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Solicitud cerrada.</p>
            )}
          </article>
        ))}
      </div>
      {!solicitudes.isLoading && !solicitudes.data?.length && (
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay servicios pendientes de validación.
        </p>
      )}
    </section>
  )
}
