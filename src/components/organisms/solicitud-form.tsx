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
import type { Cliente, TipoSolicitud, Ubicacion } from '@/features/catalogos/types/catalogos.types'
import { useCrearSolicitud } from '@/features/solicitudes/hooks/use-crear-solicitud'
import {
  solicitudSchema,
  type SolicitudFormData,
} from '@/features/solicitudes/schemas/solicitud.schema'

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
  const crear = useCrearSolicitud()
  const [clienteSeleccionado, setClienteSeleccionado] = useState(clienteId ?? '')
  const [archivos, setArchivos] = useState<File[]>([])
  const archivoInput = useRef<HTMLInputElement>(null)
  const disponibles = useMemo(
    () =>
      ubicaciones.data?.filter((item) => item.cliente_id === clienteSeleccionado && item.activa) ??
      [],
    [ubicaciones.data, clienteSeleccionado],
  )
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SolicitudFormData>({ resolver: zodResolver(solicitudSchema) })
  const resumenErroresRef = useRef<HTMLDivElement>(null)
  const erroresResumen = [
    errors.nombre && { id: 'nombre', label: 'Título de la solicitud' },
    errors.tipo_solicitud_id && { id: 'tipo_solicitud_id', label: 'Tipo de servicio' },
    errors.ubicacion_id && { id: 'ubicacion_id', label: 'Ubicación' },
    errors.detalle && { id: 'detalle', label: 'Detalle de la necesidad' },
  ].filter((campo): campo is { id: string; label: string } => Boolean(campo))

  async function enviar(values: SolicitudFormData) {
    if (!clienteSeleccionado) return
    await crear.mutateAsync({
      ...values,
      cliente_id: clienteSeleccionado,
      solicitante_id: usuarioId,
      archivos,
      como_gestor: comoGestor,
    })
    reset()
    setArchivos([])
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
        {errors.ubicacion_id && <span className="text-destructive">{errors.ubicacion_id.message}</span>}
      </label>
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
        <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground sm:col-span-2">
          {crear.error.message}
        </p>
      )}
      {crear.isSuccess && (
        <p role="status" className="rounded-md bg-success-soft p-3 text-sm text-success-soft-foreground sm:col-span-2">
          Solicitud creada correctamente.
        </p>
      )}
      <div className="flex justify-end border-t pt-5 sm:col-span-2">
        <Button
          type="submit"
          disabled={crear.isPending || !clienteSeleccionado || !disponibles.length}
        >
          {crear.isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
          {crear.isPending ? 'Creando…' : 'Crear solicitud'}
        </Button>
      </div>
    </form>
  )
}
