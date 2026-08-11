import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { LocationMap } from '@/components/organisms/location-map'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Vehiculo } from '@/features/catalogos/types/catalogos.types'
import { useGuardarControlRuta } from '@/features/rutas/hooks/use-control-rutas'
import type {
  EstadoCheckpoint,
  EstadoOperarioRuta,
  EstadoVehiculoRuta,
  SolicitudParaRuta,
} from '@/features/rutas/types/rutas.types'
import { useOperadores } from '@/features/solicitudes/hooks/use-operadores'

interface FormState {
  vehiculo_id: string
  provincia: string
  canton: string
  distrito: string
  otras_senas: string
  latitud: string
  longitud: string
  estado_vehiculo: EstadoVehiculoRuta
  estado_checkpoint: EstadoCheckpoint
  operarios: Record<string, EstadoOperarioRuta>
}

function stateFromSolicitud(solicitud: SolicitudParaRuta): FormState {
  const ruta = solicitud.ruta
  const operarios: Record<string, EstadoOperarioRuta> = ruta?.ruta_operarios.length
    ? Object.fromEntries(ruta.ruta_operarios.map((item) => [item.operario_id, item.estado]))
    : solicitud.operador_id
      ? { [solicitud.operador_id]: 'disponible' as EstadoOperarioRuta }
      : {}
  if (solicitud.operador_id && !operarios[solicitud.operador_id]) {
    operarios[solicitud.operador_id] = 'disponible'
  }
  return {
    vehiculo_id: ruta?.vehiculo_id ?? '',
    provincia: ruta?.provincia ?? solicitud.ubicacion?.provincia ?? '',
    canton: ruta?.canton ?? solicitud.ubicacion?.canton ?? '',
    distrito: ruta?.distrito ?? solicitud.ubicacion?.distrito ?? '',
    otras_senas: ruta?.otras_senas ?? solicitud.ubicacion?.otras_senas ?? '',
    latitud: String(ruta?.latitud ?? solicitud.ubicacion?.latitud ?? ''),
    longitud: String(ruta?.longitud ?? solicitud.ubicacion?.longitud ?? ''),
    estado_vehiculo: ruta?.estado_vehiculo ?? 'disponible',
    estado_checkpoint: ruta?.estado_checkpoint ?? 'pendiente',
    operarios,
  }
}

export function RouteControlForm({
  solicitud,
  onClose,
}: {
  solicitud: SolicitudParaRuta
  onClose: () => void
}) {
  const [values, setValues] = useState<FormState>(() => stateFromSolicitud(solicitud))
  const { listado: vehiculos } = useCatalogo<Vehiculo>('vehiculos')
  const operadores = useOperadores()
  const guardar = useGuardarControlRuta()
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => setValues(stateFromSolicitud(solicitud)), [solicitud])

  function toggleOperario(id: string, checked: boolean) {
    setValues((current) => {
      const operarios = { ...current.operarios }
      if (checked) operarios[id] = 'disponible'
      else delete operarios[id]
      return { ...current, operarios }
    })
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    setValidationError(null)
    const latitud = values.latitud === '' ? null : Number(values.latitud)
    const longitud = values.longitud === '' ? null : Number(values.longitud)
    if ((latitud === null) !== (longitud === null)) {
      setValidationError('Latitud y longitud deben completarse juntas.')
      return
    }
    await guardar.mutateAsync({
      solicitud_id: solicitud.id,
      vehiculo_id: values.vehiculo_id,
      provincia: values.provincia,
      canton: values.canton,
      distrito: values.distrito,
      otras_senas: values.otras_senas,
      latitud,
      longitud,
      estado_vehiculo: values.estado_vehiculo,
      estado_checkpoint: values.estado_checkpoint,
      operarios: Object.entries(values.operarios).map(([operario_id, estado]) => ({
        operario_id,
        estado,
      })),
    })
    onClose()
  }

  const latitude =
    values.latitud === '' || Number.isNaN(Number(values.latitud)) ? null : Number(values.latitud)
  const longitude =
    values.longitud === '' || Number.isNaN(Number(values.longitud)) ? null : Number(values.longitud)

  return (
    <form onSubmit={enviar} className="space-y-6 rounded-lg border bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">
          Ruta de #{solicitud.numero}: {solicitud.nombre}
        </h2>
        <p className="text-sm text-muted-foreground">{solicitud.cliente?.nombre}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Vehículo
          <Select
            required
            value={values.vehiculo_id}
            onChange={(event) => setValues({ ...values, vehiculo_id: event.target.value })}
          >
            <option value="">Seleccione…</option>
            {vehiculos.data
              ?.filter((item) => item.activo)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.placa} — {item.tipo} ({item.estado.replace(/_/g, ' ')})
                </option>
              ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Estado del vehículo en esta ruta
          <Select
            value={values.estado_vehiculo}
            onChange={(event) =>
              setValues({ ...values, estado_vehiculo: event.target.value as EstadoVehiculoRuta })
            }
          >
            <option value="disponible">Disponible</option>
            <option value="en_uso">En uso</option>
            <option value="mantenimiento">Mantenimiento</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Checkpoint de ubicación
          <Select
            value={values.estado_checkpoint}
            onChange={(event) =>
              setValues({ ...values, estado_checkpoint: event.target.value as EstadoCheckpoint })
            }
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_transito">En tránsito</option>
            <option value="llego">Llegó</option>
          </Select>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-semibold">Operarios asignados</legend>
        {operadores.data?.map((operador) => {
          const seleccionado = values.operarios[operador.id]
          return (
            <div
              key={operador.id}
              className="grid items-center gap-3 rounded-md border p-3 sm:grid-cols-[1fr_180px]"
            >
              <label className="flex items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={Boolean(seleccionado)}
                  disabled={operador.id === solicitud.operador_id}
                  onChange={(event) => toggleOperario(operador.id, event.target.checked)}
                />
                {operador.nombre_completo}
                {operador.id === solicitud.operador_id ? ' (principal)' : ''}
              </label>
              {seleccionado && (
                <Select
                  value={seleccionado}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      operarios: {
                        ...current.operarios,
                        [operador.id]: event.target.value as EstadoOperarioRuta,
                      },
                    }))
                  }
                >
                  <option value="disponible">Disponible</option>
                  <option value="en_ruta">En ruta</option>
                  <option value="ocupado">Ocupado</option>
                </Select>
              )}
            </div>
          )
        })}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Provincia
          <Input
            required
            value={values.provincia}
            onChange={(event) => setValues({ ...values, provincia: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Cantón
          <Input
            required
            value={values.canton}
            onChange={(event) => setValues({ ...values, canton: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Distrito
          <Input
            required
            value={values.distrito}
            onChange={(event) => setValues({ ...values, distrito: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-3">
          Otras señas
          <Textarea
            value={values.otras_senas}
            onChange={(event) => setValues({ ...values, otras_senas: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Latitud
          <Input
            type="number"
            min="-90"
            max="90"
            step="0.000001"
            value={values.latitud}
            onChange={(event) => setValues({ ...values, latitud: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Longitud
          <Input
            type="number"
            min="-180"
            max="180"
            step="0.000001"
            value={values.longitud}
            onChange={(event) => setValues({ ...values, longitud: event.target.value })}
          />
        </label>
      </div>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Ubicación de la ruta en el mapa</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirme el punto registrado o haga clic en otra posición del mapa de Costa Rica para
            actualizarlo.
          </p>
        </div>
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          label={`Solicitud #${solicitud.numero}`}
          selectable
          onLocationChange={(latitud, longitud) =>
            setValues((current) => ({
              ...current,
              latitud: String(latitud),
              longitud: String(longitud),
            }))
          }
        />
      </div>
      {guardar.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {guardar.error.message}
        </p>
      )}
      {validationError && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {validationError}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={
            guardar.isPending || !values.vehiculo_id || Object.keys(values.operarios).length === 0
          }
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar control de ruta'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
