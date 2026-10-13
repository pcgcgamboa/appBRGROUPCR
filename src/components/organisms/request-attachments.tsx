import { FileText } from 'lucide-react'
import { Skeleton } from '@/components/atoms/skeleton'
import { useAdjuntosSolicitud } from '@/features/solicitudes/hooks/use-borrador-solicitud'
import { normalizarError } from '@/lib/errores'

const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })

/** Documentos y fotos adjuntos a una solicitud (al crearla, como borrador o en los avances). */
export function RequestAttachments({ solicitudId }: { solicitudId: string }) {
  const adjuntos = useAdjuntosSolicitud(solicitudId)

  if (adjuntos.isLoading)
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  if (adjuntos.error)
    return (
      <p
        role="alert"
        className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
      >
        {normalizarError(adjuntos.error).mensaje}
      </p>
    )
  if (!adjuntos.data?.length)
    return (
      <p className="text-sm text-muted-foreground">La solicitud no tiene documentos adjuntos.</p>
    )

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {adjuntos.data.map((adjunto) => {
        const esImagen = adjunto.mime_type.startsWith('image/')
        return (
          <li key={adjunto.id} className="overflow-hidden rounded-lg border bg-card">
            <a
              href={adjunto.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-28 items-center justify-center bg-muted/40"
              aria-label={`Abrir ${adjunto.nombre_archivo}`}
            >
              {esImagen && adjunto.url ? (
                <img
                  src={adjunto.url}
                  alt={adjunto.nombre_archivo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText className="size-10 text-primary" />
              )}
            </a>
            <div className="p-3">
              <a
                href={adjunto.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                {adjunto.nombre_archivo}
              </a>
              <p className="text-xs text-muted-foreground">
                {fecha.format(new Date(adjunto.creado_en))}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
