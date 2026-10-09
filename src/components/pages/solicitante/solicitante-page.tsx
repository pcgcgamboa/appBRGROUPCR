import { MessageSquare, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Skeleton } from '@/components/atoms/skeleton'
import { PageHeader } from '@/components/molecules/page-header'
import { RequestCommunications } from '@/components/organisms/request-communications'
import { SolicitudForm } from '@/components/organisms/solicitud-form'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useMisSolicitudes } from '@/features/solicitudes/hooks/use-mis-solicitudes'
import type { MiSolicitud } from '@/features/solicitudes/types/solicitudes.types'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'
import { normalizarError } from '@/lib/errores'

// Fuera del componente: referencia estable entre renders — evita que useOrdenamiento reconstruya
// su lógica interna en cada tecla/clic (ver el mismo arreglo en bandeja-encargado-page.tsx).
const accesoresOrdenamiento = {
  numero: (item: MiSolicitud) => item.numero,
  solicitud: (item: MiSolicitud) => item.nombre,
  tipo: (item: MiSolicitud) => item.tipo?.nombre ?? null,
  estado: (item: MiSolicitud) => item.estado,
  prioridad: (item: MiSolicitud) => item.prioridad,
}

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
  const {
    datosOrdenados: solicitudesOrdenadas,
    columnaActiva,
    direccion,
    ordenarPor,
  } = useOrdenamiento(solicitudes.data ?? [], accesoresOrdenamiento)
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
              {(
                [
                  ['numero', 'Número'],
                  ['solicitud', 'Solicitud'],
                  ['tipo', 'Tipo'],
                  ['estado', 'Estado'],
                  ['prioridad', 'Prioridad'],
                ] as const
              ).map(([columna, etiqueta]) => (
                <ThOrdenable
                  key={columna}
                  columna={columna}
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="px-4 py-3"
                >
                  {etiqueta}
                </ThOrdenable>
              ))}
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
            ) : solicitudesOrdenadas.length ? (
              solicitudesOrdenadas.map((solicitud) => (
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
