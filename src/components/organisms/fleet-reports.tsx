import { useMemo, useState } from 'react'
import { Select } from '@/components/atoms/select'
import { useReporteFlota } from '@/features/flota/hooks/use-flota'
import { normalizarError } from '@/lib/errores'

const dinero = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 2 })}`
export function FleetReports() {
  const reporte = useReporteFlota()
  const [vehiculo, setVehiculo] = useState('')
  const filas = useMemo(
    () => reporte.data?.vehiculos.filter((v) => !vehiculo || v.id === vehiculo) ?? [],
    [reporte.data, vehiculo],
  )
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Rutas', reporte.data.totales.rutas],
          ['Kilómetros', Number(reporte.data.totales.kilometros).toLocaleString('es-CR')],
          ['Gasto en rutas', dinero(reporte.data.totales.gasto_operativo)],
          ['Gasto de flota', dinero(reporte.data.totales.gasto_flota)],
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
              <th className="py-2">Ruta</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Responsable</th>
              <th>Solicitudes</th>
              <th>Vehículos</th>
              <th>Km</th>
              <th>Gastos</th>
            </tr>
          </thead>
          <tbody>
            {reporte.data.rutas.map((r) => (
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
              <th className="py-2">Vehículo</th>
              <th>Estado</th>
              <th>Km</th>
              <th>Gasto rutas</th>
              <th>Gasto flota</th>
              <th>Depreciación acumulada</th>
              <th>Costo total controlado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((v) => (
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
