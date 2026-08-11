import { zodResolver } from '@hookform/resolvers/zod'
import { Camera } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { TipoSolicitud, Ubicacion } from '@/features/catalogos/types/catalogos.types'
import { useCrearSolicitud } from '@/features/solicitudes/hooks/use-crear-solicitud'
import {
  solicitudSchema,
  type SolicitudFormData,
} from '@/features/solicitudes/schemas/solicitud.schema'

export function SolicitudForm({ usuarioId, clienteId }: { usuarioId: string; clienteId: string }) {
  const { listado: tipos } = useCatalogo<TipoSolicitud>('tipos_solicitud')
  const { listado: ubicaciones } = useCatalogo<Ubicacion>('ubicaciones')
  const crear = useCrearSolicitud()
  const [archivos, setArchivos] = useState<File[]>([])
  const disponibles = useMemo(
    () => ubicaciones.data?.filter((item) => item.cliente_id === clienteId && item.activa) ?? [],
    [ubicaciones.data, clienteId],
  )
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SolicitudFormData>({ resolver: zodResolver(solicitudSchema) })

  async function enviar(values: SolicitudFormData) {
    await crear.mutateAsync({
      ...values,
      cliente_id: clienteId,
      solicitante_id: usuarioId,
      archivos,
    })
    reset()
    setArchivos([])
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      className="grid gap-5 rounded-lg border bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      <label className="grid gap-2 text-sm font-medium">
        Nombre
        <Input {...register('nombre')} aria-invalid={Boolean(errors.nombre)} />
        {errors.nombre && <span className="text-red-700">{errors.nombre.message}</span>}
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Tipo
        <Select {...register('tipo_solicitud_id')} aria-invalid={Boolean(errors.tipo_solicitud_id)}>
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
          <span className="text-red-700">{errors.tipo_solicitud_id.message}</span>
        )}
      </label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">
        Ubicación
        <Select {...register('ubicacion_id')} aria-invalid={Boolean(errors.ubicacion_id)}>
          <option value="">Seleccione…</option>
          {disponibles.map((ubicacion) => (
            <option key={ubicacion.id} value={ubicacion.id}>
              {ubicacion.nombre} — {ubicacion.provincia}, {ubicacion.canton}
            </option>
          ))}
        </Select>
        {errors.ubicacion_id && <span className="text-red-700">{errors.ubicacion_id.message}</span>}
      </label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">
        Detalle
        <Textarea {...register('detalle')} aria-invalid={Boolean(errors.detalle)} />
        {errors.detalle && <span className="text-red-700">{errors.detalle.message}</span>}
      </label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">
        <span className="flex items-center gap-2">
          <Camera className="size-4" />
          Fotos o documentos
        </span>
        <Input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          capture="environment"
          onChange={(event) => setArchivos(Array.from(event.target.files ?? []))}
        />
        <span className="text-xs font-normal text-muted-foreground">
          JPEG, PNG, WebP o PDF; máximo 10 MB por archivo.
        </span>
      </label>
      {crear.error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">
          {crear.error.message}
        </p>
      )}
      {crear.isSuccess && (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-800 sm:col-span-2">
          Solicitud creada correctamente.
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Creando…' : 'Crear solicitud'}
        </Button>
      </div>
    </form>
  )
}
