import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { Checkbox } from '@/components/atoms/checkbox'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Vehiculo } from '@/features/catalogos/types/catalogos.types'
import { useGuardarRutaProceso, useResponsablesRuta } from '@/features/flota/hooks/use-flota'
import type { EstadoRutaProceso, RutaProceso } from '@/features/flota/types/flota.types'
import { useSolicitudesParaRuta } from '@/features/rutas/hooks/use-control-rutas'
import { normalizarError } from '@/lib/errores'

export function ProcessRouteForm({ ruta, onClose }: { ruta?: RutaProceso; onClose: () => void }) {
  const solicitudes = useSolicitudesParaRuta()
  const { listado: vehiculos } = useCatalogo<Vehiculo>('vehiculos')
  const responsables = useResponsablesRuta()
  const guardar = useGuardarRutaProceso()
  const responsableActualDisponible =
    !ruta || responsables.data?.some((responsable) => responsable.id === ruta.responsable_id)
  const [values, setValues] = useState({
    codigo: ruta?.codigo ?? `RUTA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    nombre: ruta?.nombre ?? '',
    descripcion: ruta?.descripcion ?? '',
    fecha: ruta?.fecha_programada ?? new Date().toISOString().slice(0, 10),
    estado: ruta?.estado ?? ('planificada' as EstadoRutaProceso),
    responsable_id: ruta?.responsable_id ?? '',
    solicitudes: ruta?.ruta_solicitudes.map((x) => x.solicitud_id) ?? [],
    vehiculos: ruta?.ruta_vehiculos.map((x) => x.vehiculo_id) ?? [],
  })
  const toggle = (campo: 'solicitudes' | 'vehiculos', id: string, checked: boolean) =>
    setValues((v) => ({
      ...v,
      [campo]: checked ? [...v[campo], id] : v[campo].filter((x) => x !== id),
    }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    await guardar.mutateAsync({ id: ruta?.id, ...values })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{ruta ? 'Editar ruta' : 'Nueva ruta de proceso'}</h2>
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Código
          <Input
            required
            value={values.codigo}
            onChange={(e) => setValues({ ...values, codigo: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Nombre
          <Input
            required
            value={values.nombre}
            onChange={(e) => setValues({ ...values, nombre: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Fecha programada
          <Input
            required
            type="date"
            value={values.fecha}
            onChange={(e) => setValues({ ...values, fecha: e.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Estado
          <Select
            value={values.estado}
            onChange={(e) => setValues({ ...values, estado: e.target.value as EstadoRutaProceso })}
          >
            <option value="planificada">Planificada</option>
            <option value="en_curso">En curso</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Responsable por defecto
          <Select
            required
            value={values.responsable_id}
            onChange={(e) => setValues({ ...values, responsable_id: e.target.value })}
          >
            <option value="">Seleccione operario o encargado…</option>
            {ruta && !responsableActualDisponible && (
              <option value={ruta.responsable_id}>
                {ruta.responsable?.nombre_completo ?? 'Responsable actual'} (no disponible)
              </option>
            )}
            {responsables.data?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre_completo}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Descripción
          <Textarea
            value={values.descripcion}
            onChange={(e) => setValues({ ...values, descripcion: e.target.value })}
          />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 font-semibold">Solicitudes incluidas</legend>
        <div className="grid max-h-52 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
          {solicitudes.data?.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={values.solicitudes.includes(s.id)}
                onCheckedChange={(checked) => toggle('solicitudes', s.id, checked === true)}
              />
              #{s.numero} · {s.nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-semibold">Vehículos asociados</legend>
        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
          {vehiculos.data
            ?.filter((v) => v.activo && v.estado !== 'mantenimiento')
            .map((v) => (
              <label key={v.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.vehiculos.includes(v.id)}
                  onCheckedChange={(checked) => toggle('vehiculos', v.id, checked === true)}
                />
                {v.placa} · {v.tipo}
              </label>
            ))}
        </div>
      </fieldset>
      {guardar.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(guardar.error).mensaje}
        </p>
      )}
      <Button
        type="submit"
        disabled={
          guardar.isPending ||
          !values.responsable_id ||
          !values.solicitudes.length ||
          !values.vehiculos.length
        }
      >
        {guardar.isPending ? 'Guardando…' : 'Guardar ruta'}
      </Button>
    </form>
  )
}
