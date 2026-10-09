import { useMemo, useState } from 'react'
import { Select } from '@/components/atoms/select'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useReporteFlota } from '@/features/flota/hooks/use-flota'
import type { ReporteFlota } from '@/features/flota/types/flota.types'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'
import { normalizarError } from '@/lib/errores'

type RutaReporte = ReporteFlota['rutas'][number]
type VehiculoReporte = ReporteFlota['vehiculos'][number]

const dinero = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 2 })}`

// Objetos de accesores fuera del componente: referencia estable entre renders. Pasarle a
// useOrdenamiento un objeto nuevo en cada render (o datos recalculados sin memoizar) obliga a
// @tanstack/react-table a reconstruir toda su lógica interna en cada interacción — con listas
// grandes eso se siente como el navegador colgado al ordenar.
const accesoresRutas = {
  ruta: (r: RutaReporte) => `${r.codigo} ${r.nombre}`,
  fecha: (r: RutaReporte) => r.fecha,
  estado: (r: RutaReporte) => r.estado,
  responsable: (r: RutaReporte) => r.responsable,
  solicitudes: (r: RutaReporte) => r.solicitudes,
  vehiculos: (r: RutaReporte) => r.vehiculos,
  km: (r: RutaReporte) => r.kilometros,
  viaticos: (r: RutaReporte) => r.viaticos,
  gastos: (r: RutaReporte) => r.gastos,
}
const accesoresVehiculos = {
  vehiculo: (v: VehiculoReporte) => `${v.placa} ${v.tipo}`,
  estado: (v: VehiculoReporte) => v.estado,
  km: (v: VehiculoReporte) => v.kilometros,
  gastoRutas: (v: VehiculoReporte) => v.gasto_operativo,
  gastoFlota: (v: VehiculoReporte) => v.gasto_flota,
  depreciacion: (v: VehiculoReporte) => v.depreciacion_acumulada,
  costoTotal: (v: VehiculoReporte) =>
    Number(v.gasto_operativo) + Number(v.gasto_flota) + Number(v.depreciacion_acumulada),
}

export function FleetReports() {
  const reporte = useReporteFlota()
  const [vehiculo, setVehiculo] = useState('')
  const rutas = useMemo(() => reporte.data?.rutas ?? [], [reporte.data])
  const filas = useMemo(
    () => reporte.data?.vehiculos.filter((v) => !vehiculo || v.id === vehiculo) ?? [],
    [reporte.data, vehiculo],
  )
  const rutasOrden = useOrdenamiento(rutas, accesoresRutas)
  const vehiculosOrden = useOrdenamiento(filas, accesoresVehiculos)
  if (reporte.error)
    return (
      <p
        role="alert"
        className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
      >
        {normalizarError(reporte.error).mensaje}
      </p>
    )
  if (!reporte.data)
    return <p className="text-sm text-muted-foreground">Preparando reportes de flota…</p>
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Control de rutas y flota</h2>
        <p className="text-sm text-muted-foreground">
          Kilometraje, costos operativos, gastos independientes y depreciación lineal acumulada.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Rutas', reporte.data.totales.rutas],
          ['Kilómetros', Number(reporte.data.totales.kilometros).toLocaleString('es-CR')],
          ['Gasto en rutas', dinero(reporte.data.totales.gasto_operativo)],
          ['Gasto de flota', dinero(reporte.data.totales.gasto_flota)],
          ['Viáticos', dinero(reporte.data.totales.viaticos)],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="mt-1 text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-semibold">Informe por ruta</h3>
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr>
              <ThOrdenable
                columna="ruta"
                ordenActual={rutasOrden.columnaActiva}
                direccion={rutasOrden.direccion}
                onOrdenar={rutasOrden.ordenarPor}
                className="py-2"
              >
                Ruta
              </ThOrdenable>
              {(
                [
                  ['fecha', 'Fecha'],
                  ['estado', 'Estado'],
                  ['responsable', 'Responsable'],
                  ['solicitudes', 'Solicitudes'],
                  ['vehiculos', 'Vehículos'],
                  ['km', 'Km'],
                  ['viaticos', 'Viáticos'],
                  ['gastos', 'Gastos totales'],
                ] as const
              ).map(([columna, etiqueta]) => (
                <ThOrdenable
                  key={columna}
                  columna={columna}
                  ordenActual={rutasOrden.columnaActiva}
                  direccion={rutasOrden.direccion}
                  onOrdenar={rutasOrden.ordenarPor}
                >
                  {etiqueta}
                </ThOrdenable>
              ))}
            </tr>
          </thead>
          <tbody>
            {rutasOrden.datosOrdenados.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">
                  {r.codigo} · {r.nombre}
                </td>
                <td>{r.fecha}</td>
                <td>{r.estado}</td>
                <td>{r.responsable}</td>
                <td>{r.solicitudes}</td>
                <td>{r.vehiculos}</td>
                <td>{r.kilometros}</td>
                <td>{dinero(r.viaticos)}</td>
                <td>{dinero(r.gastos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Informe por vehículo</h3>
          <Select
            className="max-w-xs"
            value={vehiculo}
            onChange={(e) => setVehiculo(e.target.value)}
          >
            <option value="">Todos los vehículos</option>
            {reporte.data.vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} · {v.tipo}
              </option>
            ))}
          </Select>
        </div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr>
              <ThOrdenable
                columna="vehiculo"
                ordenActual={vehiculosOrden.columnaActiva}
                direccion={vehiculosOrden.direccion}
                onOrdenar={vehiculosOrden.ordenarPor}
                className="py-2"
              >
                Vehículo
              </ThOrdenable>
              {(
                [
                  ['estado', 'Estado'],
                  ['km', 'Km'],
                  ['gastoRutas', 'Gasto rutas'],
                  ['gastoFlota', 'Gasto flota'],
                  ['depreciacion', 'Depreciación acumulada'],
                  ['costoTotal', 'Costo total controlado'],
                ] as const
              ).map(([columna, etiqueta]) => (
                <ThOrdenable
                  key={columna}
                  columna={columna}
                  ordenActual={vehiculosOrden.columnaActiva}
                  direccion={vehiculosOrden.direccion}
                  onOrdenar={vehiculosOrden.ordenarPor}
                >
                  {etiqueta}
                </ThOrdenable>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehiculosOrden.datosOrdenados.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="py-2">
                  {v.placa} · {v.tipo}
                </td>
                <td>{v.estado}</td>
                <td>{v.kilometros}</td>
                <td>{dinero(v.gasto_operativo)}</td>
                <td>{dinero(v.gasto_flota)}</td>
                <td>{dinero(v.depreciacion_acumulada)}</td>
                <td className="font-semibold">
                  {dinero(
                    Number(v.gasto_operativo) +
                      Number(v.gasto_flota) +
                      Number(v.depreciacion_acumulada),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
