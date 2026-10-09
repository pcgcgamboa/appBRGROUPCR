import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Checkbox } from '@/components/atoms/checkbox'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Vehiculo } from '@/features/catalogos/types/catalogos.types'
import { useGuardarRutaProceso, useResponsablesRuta } from '@/features/flota/hooks/use-flota'
import type { EstadoRutaProceso, RutaProceso } from '@/features/flota/types/flota.types'
import { useSolicitudesParaRuta } from '@/features/rutas/hooks/use-control-rutas'
import { normalizarError } from '@/lib/errores'

interface ParticipanteFormulario {
  usuario_id: string
  viatico: number
  detalle_viatico: string
}

export function ProcessRouteForm({
  ruta,
  fechaInicial,
  onClose,
}: {
  ruta?: RutaProceso
  fechaInicial?: string
  onClose: () => void
}) {
  const solicitudes = useSolicitudesParaRuta()
  const { listado: vehiculos } = useCatalogo<Vehiculo>('vehiculos')
  const responsables = useResponsablesRuta()
  const guardar = useGuardarRutaProceso()
  const responsableActualDisponible =
    !ruta || responsables.data?.some((responsable) => responsable.id === ruta.responsable_id)
  const participantesIniciales: ParticipanteFormulario[] = ruta?.ruta_participantes.length
    ? ruta.ruta_participantes.map((participante) => ({
        usuario_id: participante.usuario_id,
        viatico: participante.viatico,
        detalle_viatico: participante.detalle_viatico ?? '',
      }))
    : ruta
      ? [{ usuario_id: ruta.responsable_id, viatico: 0, detalle_viatico: '' }]
      : []
  const [values, setValues] = useState({
    codigo: ruta?.codigo ?? `RUTA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    nombre: ruta?.nombre ?? '',
    descripcion: ruta?.descripcion ?? '',
    fecha: ruta?.fecha_programada ?? fechaInicial ?? new Date().toISOString().slice(0, 10),
    estado: ruta?.estado ?? ('planificada' as EstadoRutaProceso),
    responsable_id: ruta?.responsable_id ?? '',
    solicitudes: ruta?.ruta_solicitudes.map((item) => item.solicitud_id) ?? [],
    vehiculos: ruta?.ruta_vehiculos.map((item) => item.vehiculo_id) ?? [],
    participantes: participantesIniciales,
  })

  const toggle = (campo: 'solicitudes' | 'vehiculos', id: string, checked: boolean) =>
    setValues((actual) => ({
      ...actual,
      [campo]: checked
        ? [...actual[campo], id]
        : actual[campo].filter((elemento) => elemento !== id),
    }))

  function cambiarResponsable(responsableId: string) {
    setValues((actual) => ({
      ...actual,
      responsable_id: responsableId,
      participantes:
        responsableId && !actual.participantes.some((item) => item.usuario_id === responsableId)
          ? [
              ...actual.participantes,
              { usuario_id: responsableId, viatico: 0, detalle_viatico: '' },
            ]
          : actual.participantes,
    }))
  }

  function toggleParticipante(usuarioId: string, checked: boolean) {
    setValues((actual) => ({
      ...actual,
      participantes: checked
        ? [...actual.participantes, { usuario_id: usuarioId, viatico: 0, detalle_viatico: '' }]
        : actual.participantes.filter((item) => item.usuario_id !== usuarioId),
    }))
  }

  function actualizarParticipante(
    usuarioId: string,
    cambios: Partial<Pick<ParticipanteFormulario, 'viatico' | 'detalle_viatico'>>,
  ) {
    setValues((actual) => ({
      ...actual,
      participantes: actual.participantes.map((item) =>
        item.usuario_id === usuarioId ? { ...item, ...cambios } : item,
      ),
    }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    await guardar.mutateAsync({ id: ruta?.id, ...values })
    onClose()
  }

  const totalViaticos = values.participantes.reduce(
    (total, participante) => total + Number(participante.viatico || 0),
    0,
  )

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{ruta ? 'Editar ruta' : 'Nueva Ruta'}</h2>
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
            onChange={(event) => setValues({ ...values, codigo: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Nombre <span className="font-normal text-muted-foreground">(opcional)</span>
          <Input
            placeholder="Se usa el código si se deja en blanco"
            value={values.nombre}
            onChange={(event) => setValues({ ...values, nombre: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Fecha programada
          <Input
            required
            type="date"
            value={values.fecha}
            onChange={(event) => setValues({ ...values, fecha: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Estado
          <Select
            value={values.estado}
            onChange={(event) =>
              setValues({ ...values, estado: event.target.value as EstadoRutaProceso })
            }
          >
            <option value="planificada">Planificada</option>
            <option value="en_curso">En curso</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Operario responsable
          <Select
            required
            value={values.responsable_id}
            onChange={(event) => cambiarResponsable(event.target.value)}
          >
            <option value="">Seleccione un operario disponible…</option>
            {ruta && !responsableActualDisponible && (
              <option value={ruta.responsable_id}>
                {ruta.responsable?.nombre_completo ?? 'Responsable actual'} (no disponible)
              </option>
            )}
            {responsables.data?.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nombre_completo}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Descripción
          <Textarea
            value={values.descripcion}
            onChange={(event) => setValues({ ...values, descripcion: event.target.value })}
          />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 font-semibold">Participantes y viáticos</legend>
        <p className="mb-3 text-sm text-muted-foreground">
          Seleccione cada persona involucrada y defina su viático individual. El responsable siempre
          debe permanecer incluido.
        </p>
        <div className="space-y-3 rounded-md border p-3">
          {responsables.data?.map((usuario) => {
            const participante = values.participantes.find((item) => item.usuario_id === usuario.id)
            const esResponsable = usuario.id === values.responsable_id
            return (
              <div
                key={usuario.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[minmax(12rem,1fr)_10rem_minmax(14rem,1fr)] md:items-end"
              >
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={Boolean(participante)}
                    disabled={esResponsable}
                    onCheckedChange={(checked) => toggleParticipante(usuario.id, checked === true)}
                  />
                  {usuario.nombre_completo}
                  {esResponsable ? ' (responsable)' : ''}
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Viático
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!participante}
                    value={participante?.viatico ?? 0}
                    onChange={(event) =>
                      actualizarParticipante(usuario.id, {
                        viatico: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Detalle
                  <Input
                    disabled={!participante}
                    placeholder="Alimentación, hospedaje, traslado…"
                    value={participante?.detalle_viatico ?? ''}
                    onChange={(event) =>
                      actualizarParticipante(usuario.id, {
                        detalle_viatico: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            )
          })}
          {!responsables.isLoading && !responsables.data?.length && (
            <p className="text-sm text-muted-foreground">No hay participantes disponibles.</p>
          )}
        </div>
        <p className="mt-3 text-right text-sm font-semibold">
          Total de viáticos: ₡{totalViaticos.toLocaleString('es-CR')}
        </p>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-semibold">Solicitudes incluidas</legend>
        <div className="grid max-h-52 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
          {solicitudes.data?.map((solicitud) => (
            <label key={solicitud.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={values.solicitudes.includes(solicitud.id)}
                onCheckedChange={(checked) => toggle('solicitudes', solicitud.id, checked === true)}
              />
              <span>
                #{solicitud.numero} · {solicitud.nombre}
                {values.solicitudes.includes(solicitud.id) && values.responsable_id && (
                  <span className="block text-muted-foreground">
                    Responsable preliminar:{' '}
                    {responsables.data?.find((usuario) => usuario.id === values.responsable_id)
                      ?.nombre_completo ?? 'Operario seleccionado'}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 font-semibold">
          Vehículos asociados <span className="font-normal text-muted-foreground">(opcional)</span>
        </legend>
        <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
          {vehiculos.data
            ?.filter((vehiculo) => vehiculo.activo && vehiculo.estado !== 'mantenimiento')
            .map((vehiculo) => (
              <label key={vehiculo.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.vehiculos.includes(vehiculo.id)}
                  onCheckedChange={(checked) => toggle('vehiculos', vehiculo.id, checked === true)}
                />
                {vehiculo.placa} · {vehiculo.tipo}
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
          !values.participantes.length
        }
      >
        {guardar.isPending ? 'Guardando…' : 'Guardar ruta'}
      </Button>
    </form>
  )
}
