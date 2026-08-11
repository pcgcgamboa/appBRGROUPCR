import { ClipboardCheck, FilePlus2, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { PageHeader } from '@/components/molecules/page-header'
import { ClientValidationForm } from '@/components/organisms/client-validation-form'
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
  const [seccion, setSeccion] = useState<'solicitudes' | 'validaciones'>('solicitudes')
  if (!clienteId)
    return (
      <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        Su usuario necesita estar asociado a un cliente.
      </p>
    )
  return (
    <section className="space-y-6">
      <nav
        className="flex w-fit flex-wrap gap-2 rounded-xl border bg-white p-2 shadow-sm"
        aria-label={t('serviceValidation')}
      >
        <Button
          variant={seccion === 'solicitudes' ? 'default' : 'outline'}
          onClick={() => setSeccion('solicitudes')}
        >
          <FilePlus2 className="mr-2 size-4" />
          {t('myRequests')}
        </Button>
        <Button
          variant={seccion === 'validaciones' ? 'default' : 'outline'}
          onClick={() => setSeccion('validaciones')}
        >
          <ClipboardCheck className="mr-2 size-4" />
          {t('serviceValidation')}
        </Button>
      </nav>
      {seccion === 'solicitudes' ? (
        <SolicitantePage usuarioId={usuarioId} clienteId={clienteId} />
      ) : (
        <ValidacionesCliente
          solicitudes={solicitudes}
          seleccionada={seleccionada}
          setSeleccionada={setSeleccionada}
        />
      )}
    </section>
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
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {solicitudes.error.message}
        </p>
      )}
      {seleccionada && (
        <ClientValidationForm solicitud={seleccionada} onSaved={() => setSeleccionada(null)} />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {solicitudes.data?.map((solicitud) => (
          <article key={solicitud.id} className="rounded-lg border bg-white p-5 shadow-sm">
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
              <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-900">
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
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
          No hay servicios pendientes de validación.
        </p>
      )}
    </section>
  )
}
