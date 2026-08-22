import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Vehiculo } from '@/features/catalogos/types/catalogos.types'
import {
  useHistorialVehiculos,
  useRegistrarGestionVehiculo,
} from '@/features/flota/hooks/use-flota'

export function VehicleAdministration({ onClose }: { onClose: () => void }) {
  const { listado } = useCatalogo<Vehiculo>('vehiculos')
  const historial = useHistorialVehiculos()
  const registrar = useRegistrarGestionVehiculo()
  const hoy = new Date().toISOString().slice(0, 10)
  const [clase, setClase] = useState<'indisponibilidad' | 'gasto'>('indisponibilidad')
  const [v, setV] = useState({
    vehiculo_id: '',
    razon: 'Mantenimiento',
    detalle: '',
    inicio: hoy,
    fin: '',
    tipo: 'mantenimiento',
    concepto: '',
    monto: '',
    fecha: hoy,
  })
  async function submit(e: FormEvent) {
    e.preventDefault()
    await registrar.mutateAsync({ ...v, clase, monto: Number(v.monto || 0) })
    setV({ ...v, detalle: '', concepto: '', monto: '' })
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Control independiente de flota</h2>
          <p className="text-sm text-muted-foreground">
            Saque vehículos de operación y registre mantenimiento, aceite, reparaciones u otros
            gastos.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-lg border bg-card p-5 shadow-sm sm:grid-cols-3"
      >
        <label className="grid gap-1 text-sm">
          Operación
          <Select value={clase} onChange={(e) => setClase(e.target.value as typeof clase)}>
            <option value="indisponibilidad">Sacar de operación</option>
            <option value="gasto">Registrar gasto</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          Vehículo
          <Select
            required
            value={v.vehiculo_id}
            onChange={(e) => setV({ ...v, vehiculo_id: e.target.value })}
          >
            <option value="">Seleccione…</option>
            {listado.data?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.placa} · {x.tipo}
              </option>
            ))}
          </Select>
        </label>
        {clase === 'indisponibilidad' ? (
          <>
            <label className="grid gap-1 text-sm">
              Razón
              <Select value={v.razon} onChange={(e) => setV({ ...v, razon: e.target.value })}>
                <option>Choque</option>
                <option>Mantenimiento</option>
                <option>Avería</option>
                <option>Otro</option>
              </Select>
            </label>
            <label className="grid gap-1 text-sm">
              Inicio
              <Input
                type="date"
                required
                value={v.inicio}
                onChange={(e) => setV({ ...v, inicio: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Fin estimado
              <Input
                type="date"
                value={v.fin}
                onChange={(e) => setV({ ...v, fin: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-3">
              Detalle
              <Textarea
                value={v.detalle}
                onChange={(e) => setV({ ...v, detalle: e.target.value })}
              />
            </label>
          </>
        ) : (
          <>
            <label className="grid gap-1 text-sm">
              Tipo
              <Select value={v.tipo} onChange={(e) => setV({ ...v, tipo: e.target.value })}>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="cambio_aceite">Cambio de aceite</option>
                <option value="reparacion">Reparación</option>
                <option value="seguro">Seguro</option>
                <option value="depreciacion">Depreciación</option>
                <option value="otro">Otro</option>
              </Select>
            </label>
            <label className="grid gap-1 text-sm">
              Concepto
              <Input
                required
                value={v.concepto}
                onChange={(e) => setV({ ...v, concepto: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Monto (₡)
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={v.monto}
                onChange={(e) => setV({ ...v, monto: e.target.value })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Fecha
              <Input
                required
                type="date"
                value={v.fecha}
                onChange={(e) => setV({ ...v, fecha: e.target.value })}
              />
            </label>
          </>
        )}
        <Button disabled={registrar.isPending || !v.vehiculo_id}>
          {registrar.isPending ? 'Registrando…' : 'Registrar'}
        </Button>
      </form>
      {registrar.error && (
        <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
          {registrar.error.message}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Indisponibilidades recientes</h3>
          {(
            historial.data?.indisponibilidades.slice(0, 8) as unknown as
              | Array<{
                  id: string
                  razon: string
                  inicio: string
                  fin: string | null
                  vehiculo: { placa: string } | null
                }>
              | undefined
          )?.map((x) => (
            <p key={x.id} className="border-t py-2 text-sm">
              {x.vehiculo?.placa} · {x.razon} · {x.inicio}
              {x.fin ? ` a ${x.fin}` : ''}
            </p>
          ))}
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Gastos recientes</h3>
          {(
            historial.data?.gastos.slice(0, 8) as unknown as
              | Array<{
                  id: string
                  concepto: string
                  monto: number
                  vehiculo: { placa: string } | null
                }>
              | undefined
          )?.map((x) => (
            <p key={x.id} className="border-t py-2 text-sm">
              {x.vehiculo?.placa} · {x.concepto} · ₡{Number(x.monto).toLocaleString('es-CR')}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
