import { type FormEvent, useEffect, useState } from 'react'
import { FileCog, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import { Checkbox } from '@/components/atoms/checkbox'
import { Skeleton } from '@/components/atoms/skeleton'
import { CATEGORIAS_FOTO_REPORTE } from '@/features/catalogos/lib/categorias-foto-reporte'
import { usePlantillaReporte } from '@/features/catalogos/hooks/use-plantilla-reporte'
import type { Cliente, PlantillaReporte } from '@/features/catalogos/types/catalogos.types'
import { normalizarError } from '@/lib/errores'

const secciones: { campo: keyof PlantillaReporte; etiqueta: string; ayuda: string }[] = [
  {
    campo: 'incluir_motivo_visita',
    etiqueta: 'Motivo de la visita',
    ayuda: 'Tipo de solicitud y detalle original como motivo de la visita.',
  },
  {
    campo: 'incluir_checklist_condiciones',
    etiqueta: 'Checklist de condiciones',
    ayuda: 'Las 4 preguntas sí/no que el técnico completa al registrar el avance.',
  },
  {
    campo: 'incluir_fotos_categorizadas',
    etiqueta: 'Fotos categorizadas',
    ayuda: 'Fotos del avance agrupadas por categoría (estado inicial, resultado final, etc.).',
  },
  {
    campo: 'incluir_recomendaciones',
    etiqueta: 'Recomendaciones del técnico',
    ayuda: 'Texto libre con recomendaciones para el cliente.',
  },
]

export function ClientReportTemplateManager({
  cliente,
  onClose,
}: {
  cliente: Cliente
  onClose: () => void
}) {
  const { plantilla, guardar } = usePlantillaReporte(String(cliente.id))
  const [valores, setValores] = useState<PlantillaReporte | null>(null)

  useEffect(() => {
    if (plantilla.data) setValores(plantilla.data)
  }, [plantilla.data])

  function alternarSeccion(campo: keyof PlantillaReporte) {
    setValores((actual) => (actual ? { ...actual, [campo]: !(actual[campo] as boolean) } : actual))
  }

  function alternarCategoria(valor: string) {
    setValores((actual) => {
      if (!actual) return actual
      const activas = actual.categorias_fotos_habilitadas.includes(valor)
        ? actual.categorias_fotos_habilitadas.filter((item) => item !== valor)
        : [...actual.categorias_fotos_habilitadas, valor]
      return { ...actual, categorias_fotos_habilitadas: activas }
    })
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    if (!valores) return
    await guardar.mutateAsync(valores)
    toast.success('Plantilla de reporte actualizada correctamente.')
  }

  return (
    <section className="scroll-mt-24 space-y-5 rounded-2xl border border-primary/20 bg-card p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <FileCog className="size-5" />
            <p className="text-sm font-semibold uppercase tracking-wide">Plantilla de reporte</p>
          </div>
          <h2 className="mt-1 text-2xl font-bold">{cliente.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Secciones opcionales y fotos incluidas en el PDF de reporte de atención para este
            cliente. Datos generales, trabajos realizados, estado final y firmas siempre se
            incluyen.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={onClose} aria-label="Cerrar plantilla">
          <X className="size-4" />
        </Button>
      </div>

      {plantilla.isLoading || !valores ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-5">
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold">Secciones opcionales</legend>
            {secciones.map(({ campo, etiqueta, ayuda }) => (
              <label
                key={campo}
                className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm"
              >
                <Checkbox
                  checked={Boolean(valores[campo])}
                  onCheckedChange={() => alternarSeccion(campo)}
                />
                <span>
                  <span className="block font-medium">{etiqueta}</span>
                  <span className="block text-xs text-muted-foreground">{ayuda}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Categorías de foto habilitadas</legend>
            <div className="flex flex-wrap gap-3">
              {CATEGORIAS_FOTO_REPORTE.map((categoria) => (
                <label
                  key={categoria.valor}
                  className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={valores.categorias_fotos_habilitadas.includes(categoria.valor)}
                    onCheckedChange={() => alternarCategoria(categoria.valor)}
                  />
                  {categoria.etiqueta}
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

          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar plantilla'}
          </Button>
        </form>
      )}
    </section>
  )
}
