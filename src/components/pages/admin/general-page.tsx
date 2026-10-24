import { Sparkles, Timer } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Skeleton } from '@/components/atoms/skeleton'
import { Switch } from '@/components/atoms/switch'
import { PageHeader } from '@/components/molecules/page-header'
import {
  useActualizarIaRecomendaciones,
  useConfiguracionOperativa,
} from '@/features/configuracion/hooks/use-marca'
import { normalizarError } from '@/lib/errores'

// Configuración → General: opciones globales de la aplicación. El interruptor se guarda al
// cambiarlo; el tiempo de espera, con su botón. La Edge Function recomendar-ia respeta ambos
// también del lado del servidor.
export function GeneralPage() {
  const configuracion = useConfiguracionOperativa()
  const actualizar = useActualizarIaRecomendaciones()
  const activa = configuracion.data?.ia_recomendaciones_activa ?? false
  // Vacío = sin editar: se muestra el valor guardado.
  const [segundos, setSegundos] = useState('')
  const valorSegundos = segundos || String(configuracion.data?.ia_tiempo_espera_segundos ?? 6)
  const segundosValidos =
    Number.isInteger(Number(valorSegundos)) &&
    Number(valorSegundos) >= 2 &&
    Number(valorSegundos) <= 60

  function cambiar(valor: boolean) {
    actualizar.mutate(
      { activa: valor },
      {
        onSuccess: () =>
          toast.success(
            valor
              ? 'Recomendaciones con IA habilitadas.'
              : 'Recomendaciones con IA deshabilitadas. Se seguirán mostrando las sugerencias por reglas.',
          ),
      },
    )
  }

  function guardarTiempo(event: FormEvent) {
    event.preventDefault()
    actualizar.mutate(
      { tiempoEsperaSegundos: Number(valorSegundos) },
      {
        onSuccess: () => {
          setSegundos('')
          toast.success(`Tiempo máximo de la IA: ${valorSegundos} segundos.`)
        },
      },
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="General" description="Opciones generales de funcionamiento del sistema." />
      <div className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              Recomendaciones con IA
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Muestra el botón "Recomendar con IA" al asignar un operador y al planificar una ruta.
              Las sugerencias por reglas (carga, cercanía, prioridad y plazos) están siempre
              disponibles, con o sin IA.
            </p>
          </div>
          {configuracion.isLoading ? (
            <Skeleton className="h-6 w-11" />
          ) : (
            <Switch
              aria-label="Recomendaciones con IA"
              checked={activa}
              disabled={actualizar.isPending}
              onCheckedChange={cambiar}
            />
          )}
        </div>
        <form onSubmit={guardarTiempo} className="space-y-3 rounded-xl border bg-muted/40 p-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Timer className="size-4 text-primary" aria-hidden="true" />
              Tiempo máximo de espera de la IA
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Si una recomendación con IA tarda más, se cancela y se usan las sugerencias por
              reglas. Entre 2 y 60 segundos.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-2 text-sm font-medium">
              Segundos
              <Input
                type="number"
                min={2}
                max={60}
                step={1}
                className="w-32"
                value={valorSegundos}
                disabled={configuracion.isLoading}
                onChange={(event) => setSegundos(event.target.value)}
              />
            </label>
            <Button
              type="submit"
              disabled={
                actualizar.isPending ||
                !segundosValidos ||
                Number(valorSegundos) === configuracion.data?.ia_tiempo_espera_segundos
              }
            >
              Guardar
            </Button>
          </div>
        </form>
        {(configuracion.error || actualizar.error) && (
          <p
            role="alert"
            className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
          >
            {normalizarError(configuracion.error ?? actualizar.error).mensaje}
          </p>
        )}
      </div>
    </section>
  )
}
