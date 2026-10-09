import { Check, ExternalLink, FileText, X } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import {
  abrirDocumentoPostulacion,
  usePostulacionesPendientes,
  useResolverPostulacion,
} from '@/features/tecnicos/hooks/use-postulaciones-tecnicos'
import type { TipoDocumentoPostulacion } from '@/features/tecnicos/ports/tecnicos-repository'
import { normalizarError } from '@/lib/errores'

const nombresDocumento: Record<TipoDocumentoPostulacion, string> = {
  hoja_vida: 'Hoja de vida',
  hoja_delincuencia: 'Hoja de delincuencia',
  cedula: 'Cédula',
  fotografia: 'Fotografía',
}

export function TechnicianApplications() {
  const listado = usePostulacionesPendientes()
  const resolver = useResolverPostulacion()

  async function resolverPostulacion(id: string, aprobar: boolean) {
    const comentario =
      window.prompt(aprobar ? 'Comentario de aprobación (opcional)' : 'Motivo del rechazo') ?? ''
    if (!aprobar && !comentario.trim()) throw new Error('Indique el motivo del rechazo.')
    await resolver.mutateAsync({ id, aprobar, comentario })
  }

  const error = listado.error ?? resolver.error

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Postulaciones pendientes</h2>
        <p className="text-sm text-muted-foreground">
          Revise la pretensión salarial y los documentos antes de incorporar al candidato.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(error).mensaje}
        </p>
      )}
      <div className="grid gap-3">
        {listado.data?.map((postulacion) => (
          <article key={postulacion.id} className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{postulacion.nombre_completo}</h3>
                <p className="text-sm">
                  {postulacion.especialidad} · {postulacion.celular} ·{' '}
                  {postulacion.correo || 'Sin correo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {postulacion.canton}, {postulacion.provincia}
                </p>
                <p className="mt-2 text-sm">{postulacion.experiencia}</p>
                <p className="mt-2 text-sm font-semibold text-primary">
                  Pretensión salarial:{' '}
                  {new Intl.NumberFormat('es-CR', {
                    style: 'currency',
                    currency: 'CRC',
                    maximumFractionDigits: 2,
                  }).format(postulacion.pretension_salarial)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={resolver.isPending}
                  onClick={() => void resolverPostulacion(postulacion.id, true)}
                >
                  <Check className="mr-2 size-4" />
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive-soft"
                  disabled={resolver.isPending}
                  onClick={() => void resolverPostulacion(postulacion.id, false)}
                >
                  <X className="mr-2 size-4" />
                  Rechazar
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-primary" />
                Documentos adjuntos
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {postulacion.documentos.map((documento) => (
                  <Button
                    key={documento.id}
                    type="button"
                    variant="outline"
                    onClick={() => void abrirDocumentoPostulacion(documento.ruta_storage)}
                  >
                    <ExternalLink className="mr-2 size-4" />
                    {nombresDocumento[documento.tipo]}
                  </Button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!listado.isLoading && !listado.data?.length && (
        <p className="rounded-lg border bg-card p-5 text-center text-sm text-muted-foreground">
          No hay postulaciones pendientes.
        </p>
      )}
    </section>
  )
}
