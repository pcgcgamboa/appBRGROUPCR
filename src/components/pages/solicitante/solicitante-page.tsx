import { MessageSquare, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Skeleton } from '@/components/atoms/skeleton'
import { PageHeader } from '@/components/molecules/page-header'
import { RequestCommunications } from '@/components/organisms/request-communications'
import { SolicitudForm } from '@/components/organisms/solicitud-form'
import { useMisSolicitudes } from '@/features/solicitudes/hooks/use-mis-solicitudes'
import { normalizarError } from '@/lib/errores'

export function SolicitantePage({
  usuarioId,
  clienteId,
}: {
  usuarioId: string
  clienteId: string | null
}) {
  const solicitudes = useMisSolicitudes(usuarioId)
  const [creando, setCreando] = useState(false)
  const [comunicacionId, setComunicacionId] = useState<string | null>(null)
  if (!clienteId)
    return (
      <p
        role="alert"
        className="rounded-md bg-warning-soft p-4 text-sm text-warning-soft-foreground"
      >
        Su usuario necesita estar asociado a un cliente antes de crear solicitudes.
      </p>
    )

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Mis solicitudes"
          description="Cree una solicitud y consulte su estado de atención."
        />
        <Button onClick={() => setCreando((actual) => !actual)}>
          {creando ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          {creando ? 'Cerrar formulario' : 'Nueva solicitud'}
        </Button>
      </div>
      {creando && (
        <SolicitudForm
          usuarioId={usuarioId}
          clienteId={clienteId}
          onCreated={() => setCreando(false)}
        />
      )}
      {solicitudes.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(solicitudes.error).mensaje}
        </p>
      )}
      {comunicacionId && (
        <div className="space-y-3">
          <RequestCommunications solicitudId={comunicacionId} />
          <Button variant="outline" onClick={() => setComunicacionId(null)}>
            Cerrar comunicación
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Prioridad</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index} className="border-t">
                  {Array.from({ length: 6 }).map((__, cell) => (
                    <td key={cell} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : solicitudes.data?.length ? (
              solicitudes.data.map((solicitud) => (
                <tr key={solicitud.id} className="border-t transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3">#{solicitud.numero}</td>
                  <td className="px-4 py-3 font-medium">{solicitud.nombre}</td>
                  <td className="px-4 py-3">{solicitud.tipo?.nombre}</td>
                  <td className="px-4 py-3">
                    <Badge>{solicitud.estado.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3">{solicitud.prioridad ?? 'Pendiente'}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="outline"
                      className="h-9"
                      onClick={() => setComunicacionId(solicitud.id)}
                    >
                      <MessageSquare className="mr-2 size-4" />
                      Mensajes
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
