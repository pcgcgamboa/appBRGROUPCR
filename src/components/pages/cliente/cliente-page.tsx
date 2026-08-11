import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { LogoutButton } from '@/components/molecules/logout-button'
import { PageHeader } from '@/components/molecules/page-header'
import { ClientValidationForm } from '@/components/organisms/client-validation-form'
import { useSolicitudesCliente } from '@/features/cliente/hooks/use-cliente'
import type { SolicitudCliente } from '@/features/cliente/types/cliente.types'

export function ClientePage({ clienteId }: { clienteId: string | null }) {
  const solicitudes = useSolicitudesCliente(clienteId)
  const [seleccionada, setSeleccionada] = useState<SolicitudCliente | null>(null)
  if (!clienteId)
    return (
      <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        Su usuario necesita estar asociado a un cliente.
      </p>
    )
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Validación de servicios"
          description="Indique su satisfacción o comentarios para completar el cierre."
        />
        <LogoutButton />
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
