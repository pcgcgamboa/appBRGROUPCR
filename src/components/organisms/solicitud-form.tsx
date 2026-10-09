import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, LoaderCircle, Paperclip, UploadCloud, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { FormErrorSummary } from '@/components/molecules/form-error-summary'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type {
  Cliente,
  EquipoCliente,
  TipoSolicitud,
  Ubicacion,
} from '@/features/catalogos/types/catalogos.types'
import { useCrearSolicitud } from '@/features/solicitudes/hooks/use-crear-solicitud'
import { useSolicitudesOriginalesDisponibles } from '@/features/solicitudes/hooks/use-solicitudes-originales'
import {
  solicitudSchema,
  type SolicitudFormData,
} from '@/features/solicitudes/schemas/solicitud.schema'
import { normalizarError } from '@/lib/errores'

export function SolicitudForm({
  usuarioId,
  clienteId,
  comoGestor = false,
  onCreated,
}: {
  usuarioId: string
  clienteId: string | null
  comoGestor?: boolean
  onCreated?: () => void
}) {
  const { listado: clientes } = useCatalogo<Cliente>('clientes')
  const { listado: tipos } = useCatalogo<TipoSolicitud>('tipos_solicitud')
  const { listado: ubicaciones } = useCatalogo<Ubicacion>('ubicaciones')
  const { listado: equipos } = useCatalogo<EquipoCliente>('equipos_cliente')
  const crear = useCrearSolicitud()
  const [clienteSeleccionado, setClienteSeleccionado] = useState(clienteId ?? '')
  const [archivos, setArchivos] = useState<File[]>([])
  const archivoInput = useRef<HTMLInputElement>(null)
  const [equipoId, setEquipoId] = useState('')
  const [agregandoEquipo, setAgregandoEquipo] = useState(false)
  const [equipoNuevo, setEquipoNuevo] = useState({ nombre: '', marca: '', modelo: '', serie: '' })
  const [solicitudOriginalId, setSolicitudOriginalId] = useState('')
  // Estable mientras el usuario reintenta el mismo envío (p. ej. tras un error de red); se rota
  // solo después de una creación exitosa, para que una solicitud nueva no reutilice la clave de
  // la anterior y reciba por error su resultado cacheado.
  const claveIdempotencia = useRef(crypto.randomUUID())
  const disponibles = useMemo(
    () =>
      ubicaciones.data?.filter((item) => item.cliente_id === clienteSeleccionado && item.activa) ??
      [],
    [ubicaciones.data, clienteSeleccionado],
  )
  const equiposDisponibles = useMemo(
    () =>
      equipos.data?.filter((item) => item.cliente_id === clienteSeleccionado && item.activo) ?? [],
    [equipos.data, clienteSeleccionado],
  )
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SolicitudFormData>({ resolver: zodResolver(solicitudSchema) })
  const tipoSeleccionadoId = watch('tipo_solicitud_id')
  const esGarantia =
    tipos.data?.find((tipo) => tipo.id === tipoSeleccionadoId)?.es_garantia ?? false
  const solicitudesOriginales = useSolicitudesOriginalesDisponibles(
    clienteSeleccionado || null,
    esGarantia ? equipoId || null : null,
  )
  const resumenErroresRef = useRef<HTMLDivElement>(null)
  const erroresResumen = [
    errors.nombre && { id: 'nombre', label: 'Título de la solicitud' },
    errors.tipo_solicitud_id && { id: 'tipo_solicitud_id', label: 'Tipo de servicio' },
    errors.ubicacion_id && { id: 'ubicacion_id', label: 'Ubicación' },
    errors.detalle && { id: 'detalle', label: 'Detalle de la necesidad' },
  ].filter((campo): campo is { id: string; label: string } => Boolean(campo))

  async function enviar(values: SolicitudFormData) {
    if (!clienteSeleccionado) return
    if (esGarantia && (!equipoId || !solicitudOriginalId)) return
    await crear.mutateAsync({
      ...values,
      cliente_id: clienteSeleccionado,
      solicitante_id: usuarioId,
      archivos,
      como_gestor: comoGestor,
      equipo_id: agregandoEquipo ? null : equipoId || null,
      equipo_nuevo: agregandoEquipo
        ? {
            nombre: equipoNuevo.nombre,
            marca: equipoNuevo.marca || undefined,
            modelo: equipoNuevo.modelo || undefined,
            serie: equipoNuevo.serie || undefined,
          }
        : null,
      solicitud_original_id: esGarantia ? solicitudOriginalId : null,
      idempotencia_clave: claveIdempotencia.current,
    })
    claveIdempotencia.current = crypto.randomUUID()
    reset()
    setArchivos([])
    setEquipoId('')
    setAgregandoEquipo(false)
    setEquipoNuevo({ nombre: '', marca: '', modelo: '', serie: '' })
    setSolicitudOriginalId('')
    if (archivoInput.current) archivoInput.current.value = ''
    onCreated?.()
  }

  function quitarArchivo(indice: number) {
    setArchivos((actuales) => actuales.filter((_, posicion) => posicion !== indice))
  }

  return (
    <form
      onSubmit={handleSubmit(enviar, () => resumenErroresRef.current?.focus())}
      className="mx-auto grid w-full max-w-5xl gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:grid-cols-2 sm:p-7"
    >
      <div className="border-b pb-5 sm:col-span-2">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Nueva solicitud</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Describa la necesidad para que podamos asignarla correctamente.
            </p>
          </div>
        </div>
      </div>
      <FormErrorSummary ref={resumenErroresRef} errors={erroresResumen} />
      {comoGestor && (
        <label className="grid gap-2 text-sm font-medium sm:col-span-2">
          Cliente
          <Select
            required
            value={clienteSeleccionado}
            onChange={(event) => {
              setClienteSeleccionado(event.target.value)
              setValue('ubicacion_id', '')
              setEquipoId('')
              setSolicitudOriginalId('')
            }}
          >
            <option value="">Seleccione un cliente…</option>
            {clientes.data
              ?.filter((cliente) => cliente.activo)
              .map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
          </Select>
          <span className="text-xs font-normal text-muted-foreground">
            La solicitud quedará registrada para la organización seleccionada.
          </span>
        </label>
      )}
      <label className="grid gap-2 text-sm font-medium">
        Título de la solicitud
        <Input
          id="nombre"
          placeholder="Ej. Reparación de aire acondicionado"
          {...register('nombre')}
          aria-invalid={Boolean(errors.nombre)}
        />
        {errors.nombre && <span className="text-destructive">{errors.nombre.message}</span>}
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Tipo de servicio
        <Select
          id="tipo_solicitud_id"
          {...register('tipo_solicitud_id')}
          aria-invalid={Boolean(errors.tipo_solicitud_id)}
        >
          <option value="">Seleccione…</option>
          {tipos.data
            ?.filter((tipo) => tipo.activo)
            .map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
        </Select>
        {errors.tipo_solicitud_id && (
          <span className="text-destructive">{errors.tipo_solicitud_id.message}</span>
        )}
      </label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">
        Ubicación
        <Select
          id="ubicacion_id"
          disabled={!disponibles.length}
          {...register('ubicacion_id')}
          aria-invalid={Boolean(errors.ubicacion_id)}
        >
          <option value="">Seleccione…</option>
          {disponibles.map((ubicacion) => (
            <option key={ubicacion.id} value={ubicacion.id}>
              {ubicacion.nombre} — {ubicacion.provincia}, {ubicacion.canton}
            </option>
          ))}
        </Select>
        {!ubicaciones.isLoading && !disponibles.length && (
          <span className="text-xs font-normal text-warning">
            No hay ubicaciones activas. Solicite al administrador registrar una ubicación.
          </span>
        )}
        {errors.ubicacion_id && (
          <span className="text-destructive">{errors.ubicacion_id.message}</span>
        )}
      </label>
      {clienteSeleccionado && (
        <fieldset className="grid gap-3 rounded-lg border p-3 sm:col-span-2">
          <legend className="px-1 text-sm font-semibold">
            Equipo{esGarantia ? ' (requerido para garantía)' : ' (opcional)'}
          </legend>
          {!agregandoEquipo ? (
            <label className="grid gap-2 text-sm font-medium">
              Seleccione el equipo
              <Select
                value={equipoId}
                onChange={(event) => {
                  setEquipoId(event.target.value)
                  setSolicitudOriginalId('')
                }}
              >
                <option value="">
                  {equiposDisponibles.length ? 'Seleccione…' : 'Este cliente no tiene equipos aún'}
                </option>
                {equiposDisponibles.map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                    {equipo.marca ? ` — ${equipo.marca}` : ''}
                    {equipo.modelo ? ` ${equipo.modelo}` : ''}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                className="w-fit text-xs font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setAgregandoEquipo(true)
                  setEquipoId('')
                  setSolicitudOriginalId('')
                }}
              >
                + Agregar equipo nuevo
              </button>
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                Nombre del equipo
                <Input
                  required
                  placeholder="Ej. Horno industrial"
                  value={equipoNuevo.nombre}
                  onChange={(event) =>
                    setEquipoNuevo({ ...equipoNuevo, nombre: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Marca
                <Input
                  value={equipoNuevo.marca}
                  onChange={(event) =>
                    setEquipoNuevo({ ...equipoNuevo, marca: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Modelo
                <Input
                  value={equipoNuevo.modelo}
                  onChange={(event) =>
                    setEquipoNuevo({ ...equipoNuevo, modelo: event.target.value })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Serie
                <Input
                  value={equipoNuevo.serie}
                  onChange={(event) =>
                    setEquipoNuevo({ ...equipoNuevo, serie: event.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className="w-fit text-xs font-medium text-muted-foreground underline-offset-2 hover:underline sm:col-span-2"
                onClick={() => {
                  setAgregandoEquipo(false)
                  setEquipoNuevo({ nombre: '', marca: '', modelo: '', serie: '' })
                }}
              >
                Elegir un equipo existente en su lugar
              </button>
            </div>
          )}
          {esGarantia && (
            <label className="grid gap-2 text-sm font-medium">
              Solicitud original que reclama la garantía
              <Select
                required
                disabled={!equipoId}
                value={solicitudOriginalId}
                onChange={(event) => setSolicitudOriginalId(event.target.value)}
              >
                <option value="">
                  {!equipoId
                    ? 'Seleccione primero el equipo…'
                    : solicitudesOriginales.data?.length
                      ? 'Seleccione…'
                      : 'Este equipo no tiene trabajos atendidos aún'}
                </option>
                {solicitudesOriginales.data?.map((solicitud) => (
                  <option key={solicitud.id} value={solicitud.id}>
                    #{solicitud.numero} · {solicitud.nombre}
                  </option>
                ))}
              </Select>
              <span className="text-xs font-normal text-muted-foreground">
                Solo se listan solicitudes de este cliente y equipo ya atendidas.
              </span>
            </label>
          )}
        </fieldset>
      )}
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">
        Detalle de la necesidad
        <Textarea
          id="detalle"
          className="min-h-32"
          placeholder="Explique qué sucede, desde cuándo y cualquier información que ayude a atender el caso."
          {...register('detalle')}
          aria-invalid={Boolean(errors.detalle)}
        />
        {errors.detalle && <span className="text-destructive">{errors.detalle.message}</span>}
      </label>
      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4" />
          Evidencia opcional
        </legend>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-5 py-7 text-center transition hover:border-primary/40 hover:bg-primary/5">
          <UploadCloud className="size-7 text-primary" />
          <span className="mt-2 text-sm font-semibold">Agregar fotos o documentos</span>
          <span className="mt-1 text-xs text-muted-foreground">
            JPG, JPEG, JFIF, PNG, WebP o PDF · máximo 10 MB por archivo
          </span>
          <input
            ref={archivoInput}
            className="sr-only"
            type="file"
            multiple
            accept=".jpg,.jpeg,.jfif,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={(event) => setArchivos(Array.from(event.target.files ?? []))}
          />
        </label>
        {!!archivos.length && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {archivos.map((archivo, indice) => (
              <li
                key={`${archivo.name}-${archivo.lastModified}`}
                className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3"
              >
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{archivo.name}</span>
                <button
                  type="button"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive-soft hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Quitar ${archivo.name}`}
                  onClick={() => quitarArchivo(indice)}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      {crear.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground sm:col-span-2"
        >
          {normalizarError(crear.error).mensaje}
        </p>
      )}
      {crear.isSuccess && (
        <p
          role="status"
          className="rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground sm:col-span-2"
        >
          Solicitud creada correctamente.
        </p>
      )}
      <div className="flex justify-end border-t pt-5 sm:col-span-2">
        <Button
          type="submit"
          disabled={
            crear.isPending ||
            !clienteSeleccionado ||
            !disponibles.length ||
            (agregandoEquipo && !equipoNuevo.nombre.trim()) ||
            (esGarantia && (!equipoId || !solicitudOriginalId))
          }
        >
          {crear.isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
          {crear.isPending ? 'Creando…' : 'Crear solicitud'}
        </Button>
      </div>
    </form>
  )
}
