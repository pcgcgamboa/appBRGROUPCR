import { ClipboardPlus, ListChecks, MapPinned, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Skeleton } from '@/components/atoms/skeleton'
import { GridPagination } from '@/components/molecules/grid-pagination'
import { PageHeader } from '@/components/molecules/page-header'
import { WorkspacePanel } from '@/components/molecules/workspace-panel'
import { ProcessRouteForm } from '@/components/organisms/process-route-form'
import { VehicleMovementForm } from '@/components/organisms/vehicle-movement-form'
import { RouteTimeline } from '@/components/organisms/route-timeline'
import { useRutasProceso } from '@/features/flota/hooks/use-flota'
import type { RutaProceso } from '@/features/flota/types/flota.types'
import { normalizarError } from '@/lib/errores'

export function ControlRutasPage() {
  const rutas = useRutasProceso()
  const [editando, setEditando] = useState<RutaProceso | null | undefined>(undefined)
  const [registroRuta, setRegistroRuta] = useState<RutaProceso | null>(null)
  const [trackingRuta, setTrackingRuta] = useState<RutaProceso | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('activas')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const statusOrder: Record<string, number> = {
    en_curso: 0,
    planificada: 1,
    finalizada: 2,
    cancelada: 3,
  }
  const filtered = [...(rutas.data ?? [])]
    .filter((route) => {
      const matchesSearch =
        `${route.codigo} ${route.nombre} ${route.responsable?.nombre_completo ?? ''}`
          .toLocaleLowerCase('es')
          .includes(search.toLocaleLowerCase('es'))
      const matchesStatus =
        status === 'todas' ||
        (status === 'activas'
          ? ['planificada', 'en_curso'].includes(route.estado)
          : route.estado === status)
      return matchesSearch && matchesStatus
    })
    .sort(
      (a, b) =>
        statusOrder[a.estado] - statusOrder[b.estado] ||
        b.fecha_programada.localeCompare(a.fecha_programada),
    )
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Rutas de proceso"
          description="Agrupe solicitudes, asocie uno o varios vehículos y defina un responsable."
        />
        <Button onClick={() => setEditando(null)}>
          <Plus className="mr-2 size-4" />
          Nueva ruta
        </Button>
      </div>
      {editando !== undefined && (
        <WorkspacePanel
          variant="management"
          icon={Settings2}
          title={editando ? `Administrar ruta ${editando.codigo}` : 'Crear ruta'}
          description="Configure la ruta, las solicitudes, los vehículos y su responsable."
        >
          <ProcessRouteForm
            key={editando?.id ?? 'nueva'}
            ruta={editando ?? undefined}
            onClose={() => setEditando(undefined)}
          />
        </WorkspacePanel>
      )}{' '}
      {rutas.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(rutas.error).mensaje}
        </p>
      )}
      <WorkspacePanel
        variant="list"
        icon={ListChecks}
        title="Listado de rutas"
        description="Consulte, filtre y seleccione las rutas que desea administrar."
      >
        <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[minmax(220px,1fr)_220px]">
          <Input
            type="search"
            placeholder="Buscar por ruta o responsable…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="activas">Rutas activas</option>
            <option value="todas">Todas las rutas</option>
            <option value="planificada">Planificadas</option>
            <option value="en_curso">En curso</option>
            <option value="finalizada">Finalizadas</option>
            <option value="cancelada">Canceladas</option>
          </Select>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {rutas.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-9 w-40" />
                </div>
              ))
            : paginated.map((r) => (
                <article key={r.id} className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {r.codigo} · {r.fecha_programada}
                      </p>
                      <h2 className="font-semibold">{r.nombre}</h2>
                    </div>
                    <Badge>{r.estado.replace('_', ' ')}</Badge>
                  </div>
                  <p className="mt-3 text-sm">Responsable: {r.responsable?.nombre_completo}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.ruta_solicitudes.length} solicitud(es) ·{' '}
                    {r.ruta_vehiculos.map((x) => x.vehiculo?.placa).join(', ')}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setEditando(r)}>
                      <MapPinned className="mr-2 size-4" />
                      Editar ruta
                    </Button>
                    <Button variant="outline" onClick={() => setTrackingRuta(r)}>
                      Ver tracking
                    </Button>
                    <Button
                      variant="outline"
                      disabled={r.estado === 'cancelada'}
                      onClick={() => setRegistroRuta(r)}
                    >
                      <ClipboardPlus className="mr-2 size-4" />
                      Registro del vehículo
                    </Button>
                  </div>
                </article>
              ))}
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <GridPagination
            page={currentPage}
            total={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
        {!rutas.isLoading && !rutas.data?.length && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No hay rutas agrupadas.
          </p>
        )}
      </WorkspacePanel>
      {registroRuta && (
        <VehicleMovementForm ruta={registroRuta} onClose={() => setRegistroRuta(null)} />
      )}
      {trackingRuta && <RouteTimeline ruta={trackingRuta} onClose={() => setTrackingRuta(null)} />}
    </section>
  )
}
