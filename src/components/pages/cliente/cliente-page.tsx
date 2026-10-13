import { FilePlus2, FolderOpen } from 'lucide-react'
import { Suspense } from 'react'
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { CargandoRuta } from '@/components/molecules/cargando-ruta'
import { ClientDocumentsManager } from '@/components/organisms/client-documents-manager'
import { SolicitantePage } from '@/components/pages/solicitante/solicitante-page'
import { useI18n } from '@/lib/i18n'

type ClienteRouteContext = { usuarioId: string; clienteId: string }

// El seguimiento ya no es una pestaña: se consulta por solicitud desde "Ver detalle".
const SECCIONES = ['solicitudes', 'documentos'] as const
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
      <TabsList className="w-fit" aria-label="Portal del cliente">
        <TabsTrigger value="solicitudes">
          <FilePlus2 className="mr-2 size-4" />
          {t('myRequests')}
        </TabsTrigger>
        <TabsTrigger value="documentos">
          <FolderOpen className="mr-2 size-4" />
          Documentos
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
  return <SolicitantePage usuarioId={usuarioId} clienteId={clienteId} modoCliente />
}

export function ClienteDocumentosRoute() {
  const { clienteId } = useOutletContext<ClienteRouteContext>()
  return (
    <ClientDocumentsManager
      clienteId={clienteId}
      clienteNombre="Mi organización"
      canUpload
      esCliente
    />
  )
}
