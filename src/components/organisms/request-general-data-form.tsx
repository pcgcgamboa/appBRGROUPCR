import { FileText, Paperclip, UploadCloud, X } from 'lucide-react'
import { type FormEvent, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Cliente, TipoSolicitud, Ubicacion } from '@/features/catalogos/types/catalogos.types'
import { useEditarSolicitud } from '@/features/solicitudes/hooks/use-editar-solicitud'
import type { SolicitudAdmin } from '@/features/solicitudes/types/solicitudes.types'
import { normalizarError } from '@/lib/errores'

export function RequestGeneralDataForm({
  solicitud,
  onSaved,
  operadorNombre,
}: {
  solicitud: SolicitudAdmin
  onSaved: () => void
  operadorNombre?: string | null
}) {
  const clientes = useCatalogo<Cliente>('clientes').listado
  const ubicaciones = useCatalogo<Ubicacion>('ubicaciones').listado
  const tipos = useCatalogo<TipoSolicitud>('tipos_solicitud').listado
  const editar = useEditarSolicitud()
  const [archivos, setArchivos] = useState<File[]>([])
  const archivoInput = useRef<HTMLInputElement>(null)
  const [v, setV] = useState({
    nombre: solicitud.nombre,
    detalle: solicitud.detalle,
    cliente_id: solicitud.cliente_id,
    ubicacion_id: solicitud.ubicacion_id,
    tipo_solicitud_id: solicitud.tipo_solicitud_id,
    prioridad: solicitud.prioridad ?? '',
  })
  const disponibles = useMemo(
    () => ubicaciones.data?.filter((x) => x.cliente_id === v.cliente_id && x.activa) ?? [],
    [ubicaciones.data, v.cliente_id],
  )
  async function submit(e: FormEvent) {
    e.preventDefault()
    await editar.mutateAsync({
      solicitud_id: solicitud.id,
      ...v,
      archivos,
      prioridad: v.prioridad === '' ? null : (v.prioridad as 'baja' | 'media' | 'alta' | 'urgente'),
    })
    setArchivos([])
    if (archivoInput.current) archivoInput.current.value = ''
    onSaved()
  }

  function quitarArchivo(indice: number) {
    setArchivos((actuales) => actuales.filter((_, posicion) => posicion !== indice))
  }
  return (
    <form
      onSubmit={submit}
      className="mt-4 grid gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <h3 className="font-semibold">Datos generales</h3>
        <p className="text-xs text-muted-foreground">
          Los cambios quedan registrados en la auditoría de la solicitud.
        </p>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Nombre
        <Input required value={v.nombre} onChange={(e) => setV({ ...v, nombre: e.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Tipo
        <Select
          required
          value={v.tipo_solicitud_id}
          onChange={(e) => setV({ ...v, tipo_solicitud_id: e.target.value })}
        >
          {tipos.data
            ?.filter((x) => x.activo)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Cliente
        <Select
          required
          value={v.cliente_id}
          onChange={(e) => setV({ ...v, cliente_id: e.target.value, ubicacion_id: '' })}
        >
          {clientes.data
            ?.filter((x) => x.activo)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Ubicación
        <Select
          required
          value={v.ubicacion_id}
          onChange={(e) => setV({ ...v, ubicacion_id: e.target.value })}
        >
          <option value="">Seleccione…</option>
          {disponibles.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre} · {x.distrito}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">
        Detalle
        <Textarea
          required
          minLength={5}
          value={v.detalle}
          onChange={(e) => setV({ ...v, detalle: e.target.value })}
        />
      </label>
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Prioridad
          <Select
            value={v.prioridad}
            onChange={(e) => setV({ ...v, prioridad: e.target.value as typeof v.prioridad })}
          >
            <option value="">Por definir</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Operador
          <Input value={operadorNombre || 'Sin asignar'} disabled />
        </label>
      </div>{' '}
      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4" />
          Nueva evidencia opcional
        </legend>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card px-5 py-6 text-center transition hover:border-primary/40 hover:bg-primary/5">
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
      {editar.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground sm:col-span-2"
        >
          {normalizarError(editar.error).mensaje}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button disabled={editar.isPending}>
          {editar.isPending ? 'Guardando…' : 'Guardar datos y adjuntos'}
        </Button>
      </div>
    </form>
  )
}
