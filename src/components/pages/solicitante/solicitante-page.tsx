import { Badge } from '@/components/atoms/badge'
import { PageHeader } from '@/components/molecules/page-header'
import { SolicitudForm } from '@/components/organisms/solicitud-form'
import { useMisSolicitudes } from '@/features/solicitudes/hooks/use-mis-solicitudes'

export function SolicitantePage({
  usuarioId,
  clienteId,
}: {
  usuarioId: string
  clienteId: string | null
}) {
  const solicitudes = useMisSolicitudes(usuarioId)
  if (!clienteId)
    return (
      <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">
        Su usuario necesita estar asociado a un cliente antes de crear solicitudes.
      </p>
    )

  return (
    <section className="space-y-8">
      <div>
        <PageHeader
          title="Mis solicitudes"
          description="Cree una solicitud y consulte su estado de atención."
        />
      </div>
      <SolicitudForm usuarioId={usuarioId} clienteId={clienteId} />
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.data?.length ? (
              solicitudes.data.map((solicitud) => (
                <tr key={solicitud.id} className="border-t">
                  <td className="px-4 py-3">#{solicitud.numero}</td>
                  <td className="px-4 py-3 font-medium">{solicitud.nombre}</td>
                  <td className="px-4 py-3">{solicitud.tipo?.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge>{solicitud.estado.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3">{solicitud.prioridad ?? 'Pendiente'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay solicitudes registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
