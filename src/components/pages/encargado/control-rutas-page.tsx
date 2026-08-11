import { MapPinned } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { PageHeader } from '@/components/molecules/page-header'
import { RouteControlForm } from '@/components/organisms/route-control-form'
import { useSolicitudesParaRuta } from '@/features/rutas/hooks/use-control-rutas'
import type { SolicitudParaRuta } from '@/features/rutas/types/rutas.types'

export function ControlRutasPage() {
  const solicitudes = useSolicitudesParaRuta()
  const [seleccionada, setSeleccionada] = useState<SolicitudParaRuta | null>(null)
  return (
    <section className="space-y-6">
      <PageHeader
        title="Control de ruta"
        description="Asigne operarios, vehículo y destino para cada solicitud."
      />
      {solicitudes.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {solicitudes.error.message}
        </p>
      )}
      {seleccionada && (
        <RouteControlForm solicitud={seleccionada} onClose={() => setSeleccionada(null)} />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {solicitudes.data?.map((solicitud) => (
          <article key={solicitud.id} className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Solicitud #{solicitud.numero}</p>
                <h2 className="font-semibold">{solicitud.nombre}</h2>
                <p className="mt-1 text-sm">{solicitud.cliente?.nombre}</p>
              </div>
              <Badge>
                {solicitud.ruta ? solicitud.ruta.estado_checkpoint.replace(/_/g, ' ') : 'Sin ruta'}
              </Badge>
            </div>
            {solicitud.ruta && (
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  {solicitud.ruta.provincia}, {solicitud.ruta.canton}, {solicitud.ruta.distrito}
                </p>
                <p>
                  {solicitud.ruta.vehiculo?.placa} · {solicitud.ruta.ruta_operarios.length}{' '}
                  operario(s)
                </p>
              </div>
            )}
            <Button variant="outline" className="mt-4" onClick={() => setSeleccionada(solicitud)}>
              <MapPinned className="mr-2 size-4" />
              {solicitud.ruta ? 'Editar ruta' : 'Definir ruta'}
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}
