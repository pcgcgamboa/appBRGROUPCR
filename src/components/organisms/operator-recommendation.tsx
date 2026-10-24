import { Lightbulb, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/atoms/button'
import { useConfiguracionOperativa } from '@/features/configuracion/hooks/use-marca'
import { useRecomendarOperadorIa } from '@/features/recomendaciones/hooks/use-recomendaciones'
import { recomendarOperadoresPorReglas } from '@/features/recomendaciones/lib/reglas'
import type {
  OperadorResumen,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'
import { normalizarError } from '@/lib/errores'
import { cn } from '@/lib/utils'

/**
 * Operador sugerido para una solicitud: por reglas al instante (carga, experiencia, zona) y, a
 * demanda, con IA. Si la IA falla o no está configurada, se mantienen las sugerencias por reglas.
 */
export function OperatorRecommendation({
  solicitud,
  solicitudes,
  operadores,
  operadorElegido,
  onElegir,
}: {
  solicitud: SolicitudAdmin
  solicitudes: SolicitudAdmin[]
  operadores: OperadorResumen[]
  operadorElegido: string
  onElegir: (operadorId: string) => void
}) {
  const ia = useRecomendarOperadorIa()
  // Configuración → General puede apagar la IA; las reglas siguen siempre disponibles.
  const iaHabilitada = useConfiguracionOperativa().data?.ia_recomendaciones_activa ?? false
  const porReglas = useMemo(
    () => recomendarOperadoresPorReglas(solicitud, solicitudes, operadores),
    [solicitud, solicitudes, operadores],
  )
  const conIa = iaHabilitada && ia.isSuccess && ia.data.length > 0
  const sugerencias = conIa ? ia.data : porReglas
  if (!operadores.length) return null

  return (
    <section className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 font-medium">
          {conIa ? (
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
          ) : (
            <Lightbulb className="size-4 text-primary" aria-hidden="true" />
          )}
          Operador sugerido {conIa ? '(IA)' : '(reglas)'}
        </p>
        {iaHabilitada && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8"
            disabled={ia.isPending}
            onClick={() => ia.mutate(solicitud.id)}
          >
            <Sparkles className="mr-1 size-3" />
            {ia.isPending
              ? 'Consultando IA…'
              : conIa
                ? 'Volver a consultar IA'
                : 'Recomendar con IA'}
          </Button>
        )}
      </div>
      <ul className="grid gap-2">
        {sugerencias.map((item) => (
          <li key={item.operador_id}>
            <button
              type="button"
              onClick={() => onElegir(item.operador_id)}
              aria-pressed={operadorElegido === item.operador_id}
              className={cn(
                'min-h-11 w-full rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent',
                operadorElegido === item.operador_id && 'border-primary bg-primary-soft',
              )}
            >
              <span className="font-medium">{item.nombre}</span>
              {item.motivo && (
                <span className="block text-xs text-muted-foreground">{item.motivo}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {ia.isSuccess && !ia.data.length && (
        <p className="text-xs text-muted-foreground">
          La IA no devolvió sugerencias; se muestran las de reglas.
        </p>
      )}
      {iaHabilitada && ia.error && (
        <p role="alert" className="text-xs text-destructive">
          {normalizarError(ia.error).mensaje} Mientras tanto, se muestran las sugerencias por
          reglas.
        </p>
      )}
    </section>
  )
}
