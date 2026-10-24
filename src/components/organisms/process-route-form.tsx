import { type FormEvent, useMemo, useState } from 'react'
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
import { useRecomendacionRuta } from '@/features/recomendaciones/hooks/use-recomendacion-ruta'
import { normalizarError } from '@/lib/errores'
import { Sparkles } from 'lucide-react'

interface ParticipanteFormulario {
  usuario_id: string
  viatico: number
  detalle_viatico: string
}

export function ProcessRouteForm({
  ruta,
  fechaInicial,
  solicitudInicial,
  onClose,
}: {
  ruta?: RutaProceso
  fechaInicial?: string
  /** Ruta nueva creada desde "Programar" en la bandeja: la solicitud llega ya incluida y, si está
   * asignada, su persona queda como responsable y participante. */
  solicitudInicial?: { id: string; operadorId: string | null }
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
      : solicitudInicial?.operadorId
        ? [{ usuario_id: solicitudInicial.operadorId, viatico: 0, detalle_viatico: '' }]
        : []
  const [values, setValues] = useState({
    codigo: ruta?.codigo ?? `RUTA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    nombre: ruta?.nombre ?? '',
    descripcion: ruta?.descripcion ?? '',
    fecha: ruta?.fecha_programada ?? fechaInicial ?? new Date().toISOString().slice(0, 10),
    fecha_fin: ruta?.fecha_fin ?? '',
    estado: ruta?.estado ?? ('planificada' as EstadoRutaProceso),
    responsable_id: ruta?.responsable_id ?? solicitudInicial?.operadorId ?? '',
    solicitudes:
      ruta?.ruta_solicitudes.map((item) => item.solicitud_id) ??
      (solicitudInicial ? [solicitudInicial.id] : []),
    vehiculos: ruta?.ruta_vehiculos.map((item) => item.vehiculo_id) ?? [],
    participantes: participantesIniciales,
  })

  const toggleVehiculo = (id: string, checked: boolean) =>
    setValues((actual) => ({
      ...actual,
      vehiculos: checked
        ? [...actual.vehiculos, id]
        : actual.vehiculos.filter((elemento) => elemento !== id),
    }))

  // Persona asignada a cada solicitud incluida → solicitudes que la requieren en la ruta.
  const asignadosPorSolicitud = new Map<string, number[]>()
  for (const solicitud of solicitudes.data ?? []) {
    if (!solicitud.operador_id || !values.solicitudes.includes(solicitud.id)) continue
    asignadosPorSolicitud.set(solicitud.operador_id, [
      ...(asignadosPorSolicitud.get(solicitud.operador_id) ?? []),
      solicitud.numero,
    ])
  }

  /**
   * Incluir una solicitud ya asignada suma a su persona como participante (con viático editable);
   * quitarla la retira solo si ninguna otra solicitud incluida la requiere, no es la responsable y
   * todavía no se le definió viático — así no se pierde lo que el usuario ya capturó.
   */
  function toggleSolicitud(id: string, checked: boolean) {
    const asignado = solicitudes.data?.find((item) => item.id === id)?.operador_id
    const asignadoDisponible =
      asignado && responsables.data?.some((usuario) => usuario.id === asignado)
    setValues((actual) => {
      const incluidas = checked
        ? [...actual.solicitudes, id]
        : actual.solicitudes.filter((elemento) => elemento !== id)
      let participantes = actual.participantes
      if (asignadoDisponible && checked) {
        if (!participantes.some((item) => item.usuario_id === asignado)) {
          participantes = [
            ...participantes,
            { usuario_id: asignado, viatico: 0, detalle_viatico: '' },
          ]
        }
      } else if (asignadoDisponible && !checked) {
        const sigueRequerido = solicitudes.data?.some(
          (item) => item.operador_id === asignado && incluidas.includes(item.id),
        )
        participantes = participantes.filter(
          (item) =>
            item.usuario_id !== asignado ||
            sigueRequerido ||
            item.usuario_id === actual.responsable_id ||
            Number(item.viatico) > 0 ||
            item.detalle_viatico.trim() !== '',
        )
      }
      return { ...actual, solicitudes: incluidas, participantes }
    })
  }

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
    await guardar.mutateAsync({ id: ruta?.id, ...values, fecha_fin: values.fecha_fin || null })
    onClose()
  }

  // Una solicitud solo puede estar en una ruta (ruta_solicitudes.solicitud_id es único): las que ya
  // pertenecen a otra ruta no se ofrecen; al editar, las de esta ruta sí.
  const participantesIds = useMemo(
    () => values.participantes.map((item) => item.usuario_id),
    [values.participantes],
  )
  const recomendacion = useRecomendacionRuta({
    candidatas: solicitudes.data ?? [],
    seleccionadas: values.solicitudes,
    responsableId: values.responsable_id,
    participantes: participantesIds,
    fecha: values.fecha,
    fechaFin: values.fecha_fin || null,
    rutaId: ruta?.id,
  })
  // Las recomendadas se ordenan primero y se marcan con "(Recomendada)" en la misma lista.
  const solicitudesDisponibles = (solicitudes.data ?? [])
    .filter((solicitud) => !solicitud.ruta_proceso || solicitud.ruta_proceso.ruta_id === ruta?.id)
    .sort(
      (a, b) =>
        Number(recomendacion.recomendadas.has(b.id)) - Number(recomendacion.recomendadas.has(a.id)),
    )

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
          Fecha de inicio
          <Input
            required
            type="date"
            value={values.fecha}
            onChange={(event) =>
              setValues({
                ...values,
                fecha: event.target.value,
                // Un fin anterior al nuevo inicio deja de tener sentido.
                fecha_fin:
                  values.fecha_fin && values.fecha_fin < event.target.value ? '' : values.fecha_fin,
              })
            }
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Fecha de fin <span className="font-normal text-muted-foreground">(opcional)</span>
          <Input
            type="date"
            min={values.fecha}
            value={values.fecha_fin}
            onChange={(event) => setValues({ ...values, fecha_fin: event.target.value })}
          />
          <span className="text-xs font-normal text-muted-foreground">
            Para rutas de varios días. En blanco, la ruta dura solo la fecha de inicio.
          </span>
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
          Seleccione cada persona involucrada y defina su viático individual. El responsable y las
          personas asignadas a las solicitudes incluidas siempre deben permanecer incluidos.
        </p>
        <div className="space-y-3 rounded-md border p-3">
          {responsables.data?.map((usuario) => {
            const participante = values.participantes.find((item) => item.usuario_id === usuario.id)
            const esResponsable = usuario.id === values.responsable_id
            const asignadoA = asignadosPorSolicitud.get(usuario.id)
            return (
              <div
                key={usuario.id}
                className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[minmax(12rem,1fr)_10rem_minmax(14rem,1fr)] md:items-end"
              >
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={Boolean(participante)}
                    disabled={esResponsable || Boolean(asignadoA)}
                    onCheckedChange={(checked) => toggleParticipante(usuario.id, checked === true)}
                  />
                  {usuario.nombre_completo}
                  {esResponsable ? ' (responsable)' : ''}
                  {asignadoA && (
                    <span className="font-normal text-muted-foreground">
                      (asignado a {asignadoA.map((numero) => `#${numero}`).join(', ')})
                    </span>
                  )}
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <legend className="font-semibold">Solicitudes incluidas</legend>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={recomendacion.consultando || !solicitudesDisponibles.length}
            onClick={() => void recomendacion.recomendar()}
          >
            <Sparkles className="mr-1 size-4" />
            {recomendacion.consultando
              ? 'Consultando IA…'
              : recomendacion.iaHabilitada
                ? 'Recomendar con IA'
                : 'Recomendar'}
          </Button>
        </div>
        {recomendacion.error && (
          <p role="alert" className="mb-2 text-xs text-destructive">
            {normalizarError(recomendacion.error).mensaje} Mientras tanto, se marcan las sugeridas
            por reglas.
          </p>
        )}
        {recomendacion.origen && !recomendacion.recomendadas.size && (
          <p className="mb-2 text-xs text-muted-foreground">
            No hay solicitudes para recomendar con los datos actuales.
          </p>
        )}
        <div className="grid max-h-52 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
          {solicitudesDisponibles.map((solicitud) => {
            return (
              <label key={solicitud.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.solicitudes.includes(solicitud.id)}
                  onCheckedChange={(checked) => toggleSolicitud(solicitud.id, checked === true)}
                />
                <span>
                  #{solicitud.numero} · {solicitud.nombre}
                  {recomendacion.recomendadas.has(solicitud.id) && (
                    <>
                      {' '}
                      <strong className="text-primary">(Recomendada)</strong>
                      <span className="block text-xs text-muted-foreground">
                        {recomendacion.recomendadas.get(solicitud.id)}
                      </span>
                    </>
                  )}
                  {solicitud.operador_id ? (
                    <span className="block text-muted-foreground">
                      Asignada a: {solicitud.operador?.nombre_completo ?? 'Persona asignada'}
                      {!responsables.data?.some(
                        (usuario) => usuario.id === solicitud.operador_id,
                      ) &&
                        !responsables.isLoading &&
                        ' (no disponible como participante)'}
                    </span>
                  ) : (
                    values.solicitudes.includes(solicitud.id) &&
                    values.responsable_id && (
                      <span className="block text-muted-foreground">
                        Responsable preliminar:{' '}
                        {responsables.data?.find((usuario) => usuario.id === values.responsable_id)
                          ?.nombre_completo ?? 'Operario seleccionado'}
                      </span>
                    )
                  )}
                </span>
              </label>
            )
          })}
          {!solicitudes.isLoading && !solicitudesDisponibles.length && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              No hay solicitudes disponibles: las asignadas a otras rutas no se muestran.
            </p>
          )}
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
                  onCheckedChange={(checked) => toggleVehiculo(vehiculo.id, checked === true)}
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
