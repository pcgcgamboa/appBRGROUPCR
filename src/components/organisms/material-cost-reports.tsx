import { CircleDollarSign, PackageSearch } from 'lucide-react'
import { Skeleton } from '@/components/atoms/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { useReporteCostosMateriales } from '@/features/reportes/hooks/use-dashboard'
import { normalizarError } from '@/lib/errores'

const moneda = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 2,
})

function TablaCostos({
  encabezados,
  filas,
}: {
  encabezados: string[]
  filas: (string | number)[][]
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {encabezados.map((encabezado, indice) => (
              <th
                key={encabezado}
                className={
                  indice === encabezados.length - 1
                    ? 'px-4 py-3 text-right font-semibold'
                    : 'px-4 py-3 font-semibold'
                }
              >
                {encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length ? (
            filas.map((fila, indiceFila) => (
              <tr key={indiceFila} className="border-t transition-colors hover:bg-accent/50">
                {fila.map((valor, indice) => (
                  <td
                    key={indice}
                    className={
                      indice === fila.length - 1
                        ? 'px-4 py-3 text-right font-semibold tabular-nums'
                        : 'px-4 py-3'
                    }
                  >
                    {valor}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={encabezados.length}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No hay costos de materiales registrados para este análisis.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function MaterialCostReports() {
  const reporte = useReporteCostosMateriales()

  return (
    <section className="space-y-4" aria-labelledby="titulo-costos-materiales">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="titulo-costos-materiales" className="flex items-center gap-2 text-xl font-bold">
            <PackageSearch className="size-5 text-primary" />
            Costos de materiales
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
          <TabsList aria-label="Agrupar costos de materiales">
            <TabsTrigger value="solicitud">Por solicitud</TabsTrigger>
            <TabsTrigger value="ruta">Por ruta</TabsTrigger>
            <TabsTrigger value="encargado">Por encargado</TabsTrigger>
          </TabsList>
          <TabsContent value="solicitud">
            <TablaCostos
              encabezados={['Solicitud', 'Cliente', 'Registros', 'Costo']}
              filas={reporte.data.por_solicitud.map((item) => [
                `#${item.numero} · ${item.nombre}`,
                item.cliente,
                item.registros_materiales,
                moneda.format(item.costo_total),
              ])}
            />
          </TabsContent>
          <TabsContent value="ruta">
            <TablaCostos
              encabezados={['Ruta', 'Fecha', 'Encargado', 'Solicitudes', 'Costo']}
              filas={reporte.data.por_ruta.map((item) => [
                `${item.codigo} · ${item.nombre}`,
                new Intl.DateTimeFormat('es-CR').format(new Date(`${item.fecha}T12:00:00`)),
                item.encargado,
                item.solicitudes,
                moneda.format(item.costo_total),
              ])}
            />
          </TabsContent>
          <TabsContent value="encargado">
            <TablaCostos
              encabezados={['Encargado', 'Rutas', 'Solicitudes', 'Costo']}
              filas={reporte.data.por_encargado.map((item) => [
                item.encargado,
                item.rutas,
                item.solicitudes,
                moneda.format(item.costo_total),
              ])}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </section>
  )
}
