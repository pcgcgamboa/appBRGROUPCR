import { Activity, Clock3 } from 'lucide-react'
import { Skeleton } from '@/components/atoms/skeleton'
import { GridPagination } from '@/components/molecules/grid-pagination'
import { TrackingControls } from '@/components/molecules/tracking-controls'
import { useTrackingSolicitud } from '@/features/solicitudes/hooks/use-tracking-solicitud'
import { useTrackingFilters } from '@/hooks/use-tracking-filters'
import { normalizarError } from '@/lib/errores'

const formatoFecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })

export function RequestTimeline({ solicitudId }: { solicitudId: string }) {
  const tracking = useTrackingSolicitud(solicitudId)
  const filters = useTrackingFilters(tracking.data ?? [], {
    date: (item) => item.creado_en,
    type: (item) => item.tipo,
    text: (item) =>
      [item.titulo, item.descripcion, item.actor?.nombre_completo, item.tipo]
        .filter(Boolean)
        .join(' '),
  })
  return (
    <section className="rounded-xl border bg-card p-4" aria-labelledby="tracking-title">
      <div className="flex items-center gap-2">
        <Activity className="size-5 text-primary" />
        <div>
          <h3 id="tracking-title" className="font-semibold">
            Tracking de la solicitud
          </h3>
          <p className="text-sm text-muted-foreground">
            Historial completo de cambios y operaciones.
          </p>
        </div>
      </div>
      {tracking.error && (
        <p
          role="alert"
          className="mt-4 rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(tracking.error).mensaje}
        </p>
      )}
      {tracking.isLoading && (
        <div className="mt-5 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!tracking.isLoading && !tracking.error && !tracking.data?.length && (
        <p className="mt-4 rounded-md bg-muted p-4 text-sm text-muted-foreground">
          No hay movimientos registrados todavía.
        </p>
      )}
      {tracking.data && tracking.data.length > 0 && (
        <>
          <div className="mt-4">
            <TrackingControls
              search={filters.search}
              onSearchChange={filters.setSearch}
              type={filters.type}
              onTypeChange={filters.setType}
              types={filters.types}
              order={filters.order}
              onOrderChange={filters.setOrder}
            />
          </div>
          {!filters.filtered.length && (
            <p className="mt-4 rounded-md bg-muted p-4 text-sm text-muted-foreground">
              No hay movimientos para los filtros seleccionados.
            </p>
          )}
          <ol className="relative mt-5 space-y-0 border-l border-border pl-5">
            {filters.paginated.map((actividad) => (
              <li key={actividad.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[1.65rem] top-0.5 grid size-5 place-items-center rounded-full border bg-card">
                  <span className="size-2 rounded-full bg-primary" />
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-medium">{actividad.titulo}</p>
                  <time
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    dateTime={actividad.creado_en}
                  >
                    <Clock3 className="size-3" />
                    {formatoFecha.format(new Date(actividad.creado_en))}
                  </time>
                </div>
                {actividad.descripcion && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {actividad.descripcion}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Por {actividad.actor?.nombre_completo ?? 'Sistema'}
                </p>
              </li>
            ))}
          </ol>
          <GridPagination
            page={filters.page}
            total={filters.filtered.length}
            pageSize={filters.pageSize}
            onPageChange={filters.setPage}
          />
        </>
      )}
    </section>
  )
}
