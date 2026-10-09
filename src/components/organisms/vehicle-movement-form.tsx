import { type FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import {
  useMovimientosVehiculo,
  useRegistrarMovimientoVehiculo,
} from '@/features/flota/hooks/use-flota'
import type { RutaProceso, TipoMovimientoVehiculo } from '@/features/flota/types/flota.types'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'
import { normalizarError } from '@/lib/errores'

interface MovimientoVehiculoHistorial {
  id: string
  fecha: string
  tipo: string
  cantidad: number | null
  unidad: string | null
  monto: number
  ruta: { codigo: string } | null
  vehiculo: { placa: string } | null
}

// Fuera del componente: referencia estable entre renders — evita que useOrdenamiento reconstruya
// su lógica interna en cada tecla/clic (ver el mismo arreglo en bandeja-encargado-page.tsx).
const accesoresOrdenamiento = {
  fecha: (item: MovimientoVehiculoHistorial) => item.fecha,
  vehiculo: (item: MovimientoVehiculoHistorial) => item.vehiculo?.placa ?? null,
  tipo: (item: MovimientoVehiculoHistorial) => item.tipo,
  cantidad: (item: MovimientoVehiculoHistorial) => item.cantidad,
  monto: (item: MovimientoVehiculoHistorial) => item.monto,
}

export function VehicleMovementForm({ ruta, onClose }: { ruta: RutaProceso; onClose: () => void }) {
  const movimientos = useMovimientosVehiculo()
  const registrar = useRegistrarMovimientoVehiculo()
  const [values, setValues] = useState({
    ruta_id: ruta.id,
    vehiculo_id: '',
    tipo: 'combustible' as TipoMovimientoVehiculo,
    cantidad: '',
    unidad: 'litros',
    monto: '',
    detalle: '',
    kilometraje_actual: '',
    fecha: new Date().toISOString().slice(0, 10),
  })
  async function submit(event: FormEvent) {
    event.preventDefault()
    await registrar.mutateAsync({
      ...values,
      cantidad: values.cantidad === '' ? null : Number(values.cantidad),
      monto: Number(values.monto || 0),
      detalle: values.detalle || null,
      unidad: values.unidad || null,
      kilometraje_actual:
        values.kilometraje_actual === '' ? null : Number(values.kilometraje_actual),
    })
    setValues((actual) => ({ ...actual, cantidad: '', monto: '', detalle: '' }))
  }
  const historialCompleto = useMemo(
    () =>
      (movimientos.data as unknown as MovimientoVehiculoHistorial[] | undefined)?.filter(
        (item) => item.ruta?.codigo === ruta.codigo,
      ) ?? [],
    [movimientos.data, ruta.codigo],
  )
  const {
    datosOrdenados: historialOrdenado,
    columnaActiva,
    direccion,
    ordenarPor,
  } = useOrdenamiento(historialCompleto, accesoresOrdenamiento)
  // El ordenamiento debe aplicarse antes de recortar a 8 filas — si se limitara primero, ordenar
  // solo reacomodaría esa ventana ya truncada en vez del historial completo de la ruta.
  const historial = historialOrdenado.slice(0, 8)
  return (
    <section className="space-y-4 rounded-lg border-2 border-primary/30 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Registro operativo · {ruta.codigo}</h2>
          <p className="text-sm text-muted-foreground">
            Combustible, kilómetros, lavado y otros gastos de {ruta.nombre}.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Vehículo
          <Select
            required
            value={values.vehiculo_id}
            onChange={(e) => setValues({ ...values, vehiculo_id: e.target.value })}
          >
            <option value="">Seleccione…</option>
            {ruta.ruta_vehiculos.map((item) => (
              <option key={item.vehiculo_id} value={item.vehiculo_id}>
                {item.vehiculo?.placa} · {item.vehiculo?.tipo}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          Tipo
          <Select
            value={values.tipo}
            onChange={(e) =>
              setValues({
                ...values,
                tipo: e.target.value as TipoMovimientoVehiculo,
                unidad:
                  e.target.value === 'kilometraje'
                    ? 'km'
                    : e.target.value === 'combustible'
                      ? 'litros'
                      : '',
              })
            }
          >
            <option value="combustible">Reabastecer gasolina</option>
            <option value="kilometraje">Kilómetros de ruta</option>
            <option value="lavado">Lavado</option>
            <option value="otro">Otro gasto</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          Cantidad
          <Input
            type="number"
            min="0"
            step="0.01"
            required={['combustible', 'kilometraje'].includes(values.tipo)}
            value={values.cantidad}
            onChange={(e) => setValues({ ...values, cantidad: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Kilometraje actual
          <Input
            type="number"
            min={
              ruta.ruta_vehiculos.find((item) => item.vehiculo_id === values.vehiculo_id)?.vehiculo
                ?.kilometraje_actual ?? 0
            }
            step="0.01"
            value={values.kilometraje_actual}
            onChange={(e) => setValues({ ...values, kilometraje_actual: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">
            Odómetro registrado:{' '}
            {ruta.ruta_vehiculos.find((item) => item.vehiculo_id === values.vehiculo_id)?.vehiculo
              ?.kilometraje_actual ?? '—'}{' '}
            km
          </span>
        </label>
        <label className="grid gap-1 text-sm">
          Unidad
          <Input
            value={values.unidad}
            onChange={(e) => setValues({ ...values, unidad: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Monto
          <Input
            type="number"
            min="0"
            step="0.01"
            value={values.monto}
            onChange={(e) => setValues({ ...values, monto: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Fecha
          <Input
            type="date"
            required
            value={values.fecha}
            onChange={(e) => setValues({ ...values, fecha: e.target.value })}
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          Detalle
          <Textarea
            value={values.detalle}
            onChange={(e) => setValues({ ...values, detalle: e.target.value })}
          />
        </label>
        <Button disabled={registrar.isPending || !values.vehiculo_id}>
          {registrar.isPending ? 'Registrando…' : 'Registrar movimiento'}
        </Button>
      </form>
      {registrar.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(registrar.error).mensaje}
        </p>
      )}
      {historial?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <ThOrdenable
                  columna="fecha"
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="py-2"
                >
                  Fecha
                </ThOrdenable>
                {(
                  [
                    ['vehiculo', 'Vehículo'],
                    ['tipo', 'Tipo'],
                    ['cantidad', 'Cantidad'],
                    ['monto', 'Monto'],
                  ] as const
                ).map(([columna, etiqueta]) => (
                  <ThOrdenable
                    key={columna}
                    columna={columna}
                    ordenActual={columnaActiva}
                    direccion={direccion}
                    onOrdenar={ordenarPor}
                  >
                    {etiqueta}
                  </ThOrdenable>
                ))}
              </tr>
            </thead>
            <tbody>
              {historial.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="py-2">{item.fecha}</td>
                  <td>{item.vehiculo?.placa}</td>
                  <td>{item.tipo}</td>
                  <td>
                    {item.cantidad ?? '—'} {item.unidad}
                  </td>
                  <td>₡{Number(item.monto).toLocaleString('es-CR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
