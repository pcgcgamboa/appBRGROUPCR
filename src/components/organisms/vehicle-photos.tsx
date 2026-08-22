import { Camera, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Textarea } from '@/components/atoms/textarea'
import type { Vehiculo } from '@/features/catalogos/types/catalogos.types'
import { useFotosVehiculo, useGestionFotosVehiculo } from '@/features/flota/hooks/use-flota'

export function VehiclePhotos({ vehiculo, onClose }: { vehiculo: Vehiculo; onClose: () => void }) {
  const fotos = useFotosVehiculo(vehiculo.id)
  const gestion = useGestionFotosVehiculo()
  const [archivos, setArchivos] = useState<File[]>([])
  const [descripcion, setDescripcion] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    await gestion.subir.mutateAsync({ vehiculoId: vehiculo.id, archivos, descripcion })
    setArchivos([])
    setDescripcion('')
  }
  return (
    <section className="space-y-4 rounded-lg border-2 border-primary/30 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Camera className="size-4" />
            Fotos de {vehiculo.placa}
          </h2>
          <p className="text-sm text-muted-foreground">Registro visual del estado del vehículo.</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          Imágenes
          <Input
            type="file"
            multiple
            required
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Descripción
          <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
        <Button disabled={!archivos.length || gestion.subir.isPending}>
          {gestion.subir.isPending ? 'Subiendo…' : 'Agregar fotos'}
        </Button>
      </form>
      {(fotos.error || gestion.subir.error || gestion.eliminar.error) && (
        <p role="alert" className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground">
          {(fotos.error || gestion.subir.error || gestion.eliminar.error)?.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fotos.data?.map((foto) => (
          <article key={foto.id} className="overflow-hidden rounded-lg border">
            <div className="aspect-video bg-muted">
              {foto.url && (
                <img
                  src={foto.url}
                  alt={foto.descripcion || foto.nombre_archivo}
                  className="size-full object-cover"
                />
              )}
            </div>
            <div className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{foto.nombre_archivo}</p>
                <p className="text-xs text-muted-foreground">
                  {foto.descripcion || 'Sin descripción'}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="text-destructive hover:bg-destructive-soft"
                aria-label="Eliminar foto"
                onClick={() => void gestion.eliminar.mutateAsync(foto)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!fotos.isLoading && !fotos.data?.length && (
        <p className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
          Este vehículo todavía no tiene fotografías.
        </p>
      )}
    </section>
  )
}
