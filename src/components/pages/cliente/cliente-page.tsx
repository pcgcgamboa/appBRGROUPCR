import { ClipboardCheck, FilePlus2, FolderOpen, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { PageHeader } from '@/components/molecules/page-header'
import { ClientValidationForm } from '@/components/organisms/client-validation-form'
import { ClientTracking } from '@/components/organisms/client-tracking'
import { ClientDocumentsManager } from '@/components/organisms/client-documents-manager'
import { SolicitantePage } from '@/components/pages/solicitante/solicitante-page'
import { useSolicitudesCliente } from '@/features/cliente/hooks/use-cliente'
import type { SolicitudCliente } from '@/features/cliente/types/cliente.types'
import { useI18n } from '@/lib/i18n'

export function ClientePage({
  usuarioId,
  clienteId,
}: {
  usuarioId: string
  clienteId: string | null
}) {
  const { t } = useI18n()
  const solicitudes = useSolicitudesCliente(clienteId)
  const [seleccionada, setSeleccionada] = useState<SolicitudCliente | null>(null)
  const [seccion, setSeccion] = useState<
    'solicitudes' | 'validaciones' | 'tracking' | 'documentos'
  >('solicitudes')
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
      onValueChange={(value) => setSeccion(value as typeof seccion)}
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
      <TabsContent value="solicitudes">
        <SolicitantePage usuarioId={usuarioId} clienteId={clienteId} />
      </TabsContent>
      <TabsContent value="documentos">
        <ClientDocumentsManager clienteId={clienteId} clienteNombre="Mi organización" canUpload />
      </TabsContent>
      <TabsContent value="tracking">
        <ClientTracking clienteId={clienteId} />
      </TabsContent>
      <TabsContent value="validaciones">
        <ValidacionesCliente
          solicitudes={solicitudes}
          seleccionada={seleccionada}
          setSeleccionada={setSeleccionada}
        />
      </TabsContent>
    </Tabs>
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
          {solicitudes.error.message}
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
