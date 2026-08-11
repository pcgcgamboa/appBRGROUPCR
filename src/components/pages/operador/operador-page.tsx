import { ClipboardCheck, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { LogoutButton } from '@/components/molecules/logout-button'
import { PageHeader } from '@/components/molecules/page-header'
import { OperatorProgressForm } from '@/components/organisms/operator-progress-form'
import { ProgressHistory } from '@/components/organisms/progress-history'
import { useSolicitudesOperador } from '@/features/operador/hooks/use-operador'
import type { SolicitudOperador } from '@/features/operador/types/operador.types'

export function OperadorPage({ usuarioId }: { usuarioId: string }) {
  const solicitudes = useSolicitudesOperador(usuarioId)
  const [seleccionada, setSeleccionada] = useState<SolicitudOperador | null>(null)
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Atención de servicios"
          description="Registre el trabajo realizado desde el sitio de atención."
        />
        <LogoutButton />
      </div>
      {solicitudes.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {solicitudes.error.message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {solicitudes.data?.map((solicitud) => (
          <article
            key={solicitud.id}
            className={
              seleccionada?.id === solicitud.id
                ? 'rounded-lg border-2 border-primary bg-white p-4 shadow-sm'
                : 'rounded-lg border bg-white p-4 shadow-sm'
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
                <span className="text-amber-800">Control de ruta pendiente</span>
              )}
            </div>
            <Button className="mt-4 w-full sm:w-auto" onClick={() => setSeleccionada(solicitud)}>
              <ClipboardCheck className="mr-2 size-4" />
              Atender solicitud
            </Button>
          </article>
        ))}
      </div>
      {!solicitudes.isLoading && !solicitudes.data?.length && (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
          No tiene solicitudes pendientes de atención.
        </p>
      )}
      {seleccionada && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <OperatorProgressForm solicitud={seleccionada} onSaved={() => setSeleccionada(null)} />
          <ProgressHistory solicitudId={seleccionada.id} />
        </div>
      )}
    </section>
  )
}
