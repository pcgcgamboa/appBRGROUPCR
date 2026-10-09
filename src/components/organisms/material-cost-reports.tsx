import { CircleDollarSign, PackageSearch } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { Skeleton } from '@/components/atoms/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useReporteCostosMateriales } from '@/features/reportes/hooks/use-dashboard'
import type { ReporteCostosMateriales } from '@/features/reportes/types/reportes.types'
import { useOrdenamiento, type ValorOrdenable } from '@/hooks/use-ordenamiento'
import { normalizarError } from '@/lib/errores'

const moneda = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 2,
})

type FilaSolicitud = ReporteCostosMateriales['por_solicitud'][number]
type FilaRuta = ReporteCostosMateriales['por_ruta'][number]
type FilaEncargado = ReporteCostosMateriales['por_encargado'][number]

interface ColumnaCostos<T> {
  id: string
  label: string
  render: (item: T) => ReactNode
  // El ordenamiento actúa sobre el objeto fuente, no sobre `render` ya formateado (una fecha o un
  // monto en colones ya convertidos a texto no se ordenan correctamente como string).
  sortValue: (item: T) => ValorOrdenable
}

function TablaCostos<T>({ columnas, filas }: { columnas: ColumnaCostos<T>[]; filas: T[] }) {
  const accesores = useMemo(
    () => Object.fromEntries(columnas.map((columna) => [columna.id, columna.sortValue])),
    [columnas],
  )
  const { datosOrdenados, columnaActiva, direccion, ordenarPor } = useOrdenamiento(filas, accesores)
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {columnas.map((columna, indice) => (
              <ThOrdenable
                key={columna.id}
                columna={columna.id}
                ordenActual={columnaActiva}
                direccion={direccion}
                onOrdenar={ordenarPor}
                className={
                  indice === columnas.length - 1
                    ? 'px-4 py-3 text-right font-semibold'
                    : 'px-4 py-3 font-semibold'
                }
              >
                {columna.label}
              </ThOrdenable>
            ))}
          </tr>
        </thead>
        <tbody>
          {datosOrdenados.length ? (
            datosOrdenados.map((item, indiceFila) => (
              <tr key={indiceFila} className="border-t transition-colors hover:bg-accent/50">
                {columnas.map((columna, indice) => (
                  <td
                    key={columna.id}
                    className={
                      indice === columnas.length - 1
                        ? 'px-4 py-3 text-right font-semibold tabular-nums'
                        : 'px-4 py-3'
                    }
                  >
                    {columna.render(item)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columnas.length}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No hay costos de inventario registrados para este análisis.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Fuera del componente: referencia estable entre renders — un array de columnas nuevo en cada
// render obliga a useOrdenamiento (dentro de TablaCostos) a reconstruir su lógica interna en cada
// interacción (ver el mismo arreglo en bandeja-encargado-page.tsx).
const columnasSolicitud: ColumnaCostos<FilaSolicitud>[] = [
  {
    id: 'solicitud',
    label: 'Solicitud',
    render: (item) => `#${item.numero} · ${item.nombre}`,
    sortValue: (item) => item.numero,
  },
  {
    id: 'cliente',
    label: 'Cliente',
    render: (item) => item.cliente,
    sortValue: (item) => item.cliente,
  },
  {
    id: 'registros',
    label: 'Registros',
    render: (item) => item.registros_materiales,
    sortValue: (item) => item.registros_materiales,
  },
  {
    id: 'costo',
    label: 'Costo',
    render: (item) => moneda.format(item.costo_total),
    sortValue: (item) => item.costo_total,
  },
]
const columnasRuta: ColumnaCostos<FilaRuta>[] = [
  {
    id: 'ruta',
    label: 'Ruta',
    render: (item) => `${item.codigo} · ${item.nombre}`,
    sortValue: (item) => `${item.codigo} ${item.nombre}`,
  },
  {
    id: 'fecha',
    label: 'Fecha',
    render: (item) => new Intl.DateTimeFormat('es-CR').format(new Date(`${item.fecha}T12:00:00`)),
    sortValue: (item) => item.fecha,
  },
  {
    id: 'encargado',
    label: 'Encargado',
    render: (item) => item.encargado,
    sortValue: (item) => item.encargado,
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    render: (item) => item.solicitudes,
    sortValue: (item) => item.solicitudes,
  },
  {
    id: 'costo',
    label: 'Costo',
    render: (item) => moneda.format(item.costo_total),
    sortValue: (item) => item.costo_total,
  },
]
const columnasEncargado: ColumnaCostos<FilaEncargado>[] = [
  {
    id: 'encargado',
    label: 'Encargado',
    render: (item) => item.encargado,
    sortValue: (item) => item.encargado,
  },
  { id: 'rutas', label: 'Rutas', render: (item) => item.rutas, sortValue: (item) => item.rutas },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    render: (item) => item.solicitudes,
    sortValue: (item) => item.solicitudes,
  },
  {
    id: 'costo',
    label: 'Costo',
    render: (item) => moneda.format(item.costo_total),
    sortValue: (item) => item.costo_total,
  },
]

export function MaterialCostReports() {
  const reporte = useReporteCostosMateriales()

  return (
    <section className="space-y-4" aria-labelledby="titulo-costos-materiales">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="titulo-costos-materiales" className="flex items-center gap-2 text-xl font-bold">
            <PackageSearch className="size-5 text-primary" />
            Costos de inventario
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Costo histórico calculado con la cantidad y el precio aplicado al registrar cada
            material.
          </p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 text-right shadow-sm">
          <p className="flex items-center justify-end gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CircleDollarSign className="size-4" /> Total registrado
          </p>
          {reporte.isLoading ? (
            <Skeleton className="mt-2 h-7 w-32" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {moneda.format(reporte.data?.total ?? 0)}
            </p>
          )}
        </div>
      </div>

      {reporte.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(reporte.error).mensaje}
        </p>
      )}
      {reporte.isLoading ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : reporte.data ? (
        <Tabs defaultValue="solicitud" className="space-y-4">
          <TabsList aria-label="Agrupar costos de inventario">
            <TabsTrigger value="solicitud">Por solicitud</TabsTrigger>
            <TabsTrigger value="ruta">Por ruta</TabsTrigger>
            <TabsTrigger value="encargado">Por encargado</TabsTrigger>
          </TabsList>
          <TabsContent value="solicitud">
            <TablaCostos filas={reporte.data.por_solicitud} columnas={columnasSolicitud} />
          </TabsContent>
          <TabsContent value="ruta">
            <TablaCostos filas={reporte.data.por_ruta} columnas={columnasRuta} />
          </TabsContent>
          <TabsContent value="encargado">
            <TablaCostos filas={reporte.data.por_encargado} columnas={columnasEncargado} />
          </TabsContent>
        </Tabs>
      ) : null}
    </section>
  )
}
