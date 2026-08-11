import { MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Textarea } from '@/components/atoms/textarea'
import { LocationMap } from '@/components/organisms/location-map'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type {
  Cliente,
  DatosFormulario,
  Ubicacion,
} from '@/features/catalogos/types/catalogos.types'

interface FormularioUbicacion {
  nombre: string
  provincia: string
  canton: string
  distrito: string
  otras_senas: string
  latitud: string
  longitud: string
  activa: boolean
}

const inicial: FormularioUbicacion = {
  nombre: '',
  provincia: '',
  canton: '',
  distrito: '',
  otras_senas: '',
  latitud: '',
  longitud: '',
  activa: true,
}

export function ClientLocationsManager({
  cliente,
  onClose,
}: {
  cliente: Cliente
  onClose: () => void
}) {
  const { listado, guardar, eliminar } = useCatalogo<Ubicacion>('ubicaciones')
  const [formVisible, setFormVisible] = useState(false)
  const [editingId, setEditingId] = useState<string>()
  const [values, setValues] = useState<FormularioUbicacion>(inicial)
  const ubicaciones = listado.data?.filter((item) => item.cliente_id === cliente.id) ?? []
  const latitud = values.latitud === '' ? null : Number(values.latitud)
  const longitud = values.longitud === '' ? null : Number(values.longitud)

  function nueva() {
    setEditingId(undefined)
    setValues(inicial)
    setFormVisible(true)
  }

  function editar(ubicacion: Ubicacion) {
    setEditingId(ubicacion.id)
    setValues({
      nombre: ubicacion.nombre,
      provincia: ubicacion.provincia,
      canton: ubicacion.canton,
      distrito: ubicacion.distrito,
      otras_senas: ubicacion.otras_senas ?? '',
      latitud: String(ubicacion.latitud ?? ''),
      longitud: String(ubicacion.longitud ?? ''),
      activa: ubicacion.activa,
    })
    setFormVisible(true)
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    if ((latitud === null) !== (longitud === null)) return
    const payload: DatosFormulario = {
      cliente_id: cliente.id,
      nombre: values.nombre,
      provincia: values.provincia,
      canton: values.canton,
      distrito: values.distrito,
      otras_senas: values.otras_senas || null,
      latitud,
      longitud,
      activa: values.activa,
    }
    await guardar.mutateAsync({ id: editingId, values: payload })
    setFormVisible(false)
  }

  async function confirmarEliminar(ubicacion: Ubicacion) {
    if (window.confirm(`¿Eliminar la ubicación “${ubicacion.nombre}”?`)) {
      await eliminar.mutateAsync(ubicacion.id)
    }
  }

  const error = listado.error ?? guardar.error ?? eliminar.error

  return (
    <section className="scroll-mt-24 space-y-5 rounded-2xl border border-primary/20 bg-white p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="size-5" />
            <p className="text-sm font-semibold uppercase tracking-wide">Ubicaciones del cliente</p>
          </div>
          <h2 className="mt-1 text-2xl font-bold">{cliente.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administre todas las sedes donde este cliente recibe servicios.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={nueva}>
            <Plus className="mr-2 size-4" /> Nueva ubicación
          </Button>
          <Button
            variant="outline"
            className="px-3"
            onClick={onClose}
            aria-label="Cerrar ubicaciones"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {formVisible && (
        <form
          onSubmit={enviar}
          className="grid gap-4 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2"
        >
          <div className="flex items-center justify-between sm:col-span-2">
            <h3 className="font-semibold">{editingId ? 'Editar ubicación' : 'Nueva ubicación'}</h3>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              onClick={() => setFormVisible(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <Campo
            label="Nombre de ubicación"
            required
            value={values.nombre}
            onChange={(nombre) => setValues({ ...values, nombre })}
          />
          <Campo
            label="Provincia"
            required
            value={values.provincia}
            onChange={(provincia) => setValues({ ...values, provincia })}
          />
          <Campo
            label="Cantón"
            required
            value={values.canton}
            onChange={(canton) => setValues({ ...values, canton })}
          />
          <Campo
            label="Distrito"
            required
            value={values.distrito}
            onChange={(distrito) => setValues({ ...values, distrito })}
          />
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">
            Otras señas
            <Textarea
              value={values.otras_senas}
              onChange={(event) => setValues({ ...values, otras_senas: event.target.value })}
            />
          </label>
          <Campo
            label="Latitud"
            type="number"
            step="0.000001"
            value={values.latitud}
            onChange={(latitud) => setValues({ ...values, latitud })}
          />
          <Campo
            label="Longitud"
            type="number"
            step="0.000001"
            value={values.longitud}
            onChange={(longitud) => setValues({ ...values, longitud })}
          />
          <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
            <input
              type="checkbox"
              className="size-5"
              checked={values.activa}
              onChange={(event) => setValues({ ...values, activa: event.target.checked })}
            />
            Ubicación activa
          </label>
          <div className="space-y-2 sm:col-span-2">
            <h4 className="text-sm font-semibold">Seleccione el punto en el mapa</h4>
            <LocationMap
              latitude={Number.isFinite(latitud) ? latitud : null}
              longitude={Number.isFinite(longitud) ? longitud : null}
              label={values.nombre || 'Ubicación seleccionada'}
              selectable
              onLocationChange={(latitude, longitude) =>
                setValues((current) => ({
                  ...current,
                  latitud: String(latitude),
                  longitud: String(longitude),
                }))
              }
            />
          </div>
          {(latitud === null) !== (longitud === null) && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              Latitud y longitud deben completarse juntas.
            </p>
          )}
          <div className="flex gap-3 sm:col-span-2">
            <Button
              type="submit"
              disabled={guardar.isPending || (latitud === null) !== (longitud === null)}
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar ubicación'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error.message}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3">Coordenadas</th>
              <th className="px-4 py-3">Activa</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {listado.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando ubicaciones…
                </td>
              </tr>
            ) : ubicaciones.length ? (
              ubicaciones.map((ubicacion) => (
                <tr key={ubicacion.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{ubicacion.nombre}</td>
                  <td className="px-4 py-3">
                    {ubicacion.distrito}, {ubicacion.canton}, {ubicacion.provincia}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {ubicacion.latitud !== null
                      ? `${ubicacion.latitud}, ${ubicacion.longitud}`
                      : 'Sin definir'}
                  </td>
                  <td className="px-4 py-3">{ubicacion.activa ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        className="h-9 px-3"
                        onClick={() => editar(ubicacion)}
                        aria-label={`Editar ${ubicacion.nombre}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 px-3 text-red-700"
                        onClick={() => void confirmarEliminar(ubicacion)}
                        aria-label={`Eliminar ${ubicacion.nombre}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Este cliente todavía no tiene ubicaciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Campo({
  label,
  value,
  onChange,
  ...props
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  step?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input {...props} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
