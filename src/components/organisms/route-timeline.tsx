import { Route } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/atoms/dialog'
import { Skeleton } from '@/components/atoms/skeleton'
import { GridPagination } from '@/components/molecules/grid-pagination'
import { TrackingControls } from '@/components/molecules/tracking-controls'
import { useTrackingRuta } from '@/features/flota/hooks/use-tracking-ruta'
import type { RutaProceso } from '@/features/flota/types/flota.types'
import { useTrackingFilters } from '@/hooks/use-tracking-filters'

const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })

export function RouteTimeline({ ruta, onClose }: { ruta: RutaProceso; onClose: () => void }) {
  const tracking = useTrackingRuta(ruta.id)
  const filters = useTrackingFilters(tracking.data ?? [], {
    date: (item) => item.creado_en,
    type: (item) => item.tipo,
    text: (item) =>
      [item.titulo, item.descripcion, item.actor?.nombre_completo, item.tipo]
        .filter(Boolean)
        .join(' '),
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(96vw,80rem)] max-w-none">
        <DialogTitle>Tracking de ruta {ruta.codigo}</DialogTitle>
        <DialogDescription>
          Cambios, solicitudes, vehículos y movimientos operativos.
        </DialogDescription>
        {tracking.error && (
          <p
            role="alert"
            className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
          >
            {tracking.error.message}
          </p>
        )}
        {tracking.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {!tracking.isLoading && !tracking.data?.length && (
          <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            No hay movimientos registrados.
          </p>
        )}
        {tracking.data && tracking.data.length > 0 && (
          <TrackingControls
            search={filters.search}
            onSearchChange={filters.setSearch}
            type={filters.type}
            onTypeChange={filters.setType}
            types={filters.types}
            order={filters.order}
            onOrderChange={filters.setOrder}
          />
        )}
        {!tracking.isLoading && tracking.data?.length && !filters.filtered.length ? (
          <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            No hay movimientos para los filtros seleccionados.
          </p>
        ) : null}
        <ol className="space-y-3">
          {filters.paginated.map((item) => (
            <li key={item.id} className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <Route className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">{item.titulo}</p>
                    <time className="text-xs text-muted-foreground">
                      {fecha.format(new Date(item.creado_en))}
                    </time>
                  </div>
                  {item.descripcion && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {item.descripcion}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Por {item.actor?.nombre_completo ?? 'Sistema'}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <GridPagination
          page={filters.page}
          total={filters.filtered.length}
          pageSize={filters.pageSize}
          onPageChange={filters.setPage}
        />
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  )
}
