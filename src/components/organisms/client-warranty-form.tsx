import { ShieldCheck } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Textarea } from '@/components/atoms/textarea'
import { useAplicarGarantia } from '@/features/solicitudes/hooks/use-aplicar-garantia'
import { descripcionEquipo } from '@/features/solicitudes/lib/portal-cliente'
import type { SolicitudPortalCliente } from '@/features/solicitudes/types/solicitudes.types'
import { normalizarError } from '@/lib/errores'

const soloFecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' })

/**
 * Aplica la garantía de una solicitud cerrada: crea una solicitud nueva enlazada a la original,
 * con su mismo tipo, ubicación y equipo. Solo pide describir la falla.
 */
export function ClientWarrantyForm({
  solicitud,
  onAplicada,
  onCancel,
}: {
  solicitud: SolicitudPortalCliente
  onAplicada: (numero: number) => void
  onCancel: () => void
}) {
  const aplicar = useAplicarGarantia()
  const [detalle, setDetalle] = useState('')
  // Estable mientras se reintenta el mismo envío (p. ej. tras un error de red).
  const claveIdempotencia = useRef(crypto.randomUUID())

  async function enviar(event: FormEvent) {
    event.preventDefault()
    const resultado = await aplicar.mutateAsync({
      solicitud_original_id: solicitud.id,
      detalle,
      idempotencia_clave: claveIdempotencia.current,
    })
    onAplicada(resultado.numero)
  }

  return (
    <form onSubmit={(event) => void enviar(event)} className="space-y-4">
      <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Solicitud original
          </dt>
          <dd>
            #{solicitud.numero} · {solicitud.nombre}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Garantía vigente hasta
          </dt>
          <dd>
            {solicitud.garantia_vence_en
              ? soloFecha.format(new Date(solicitud.garantia_vence_en))
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Ubicación
          </dt>
          <dd>{solicitud.ubicacion?.nombre ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Equipo
          </dt>
          <dd>{descripcionEquipo(solicitud.equipo) ?? 'Sin equipo asociado'}</dd>
        </div>
      </dl>
      <label className="grid gap-2 text-sm font-medium">
        ¿Qué falla del trabajo realizado?
        <Textarea
          required
          minLength={10}
          className="min-h-28"
          value={detalle}
          onChange={(event) => setDetalle(event.target.value)}
          placeholder="Describa qué sucede, desde cuándo y cualquier dato que ayude a atenderla."
        />
        <span className="text-xs font-normal text-muted-foreground">
          Se creará una solicitud de garantía enlazada a la #{solicitud.numero}, con su mismo tipo,
          ubicación y equipo. Quedará registrada en el seguimiento de ambas.
        </span>
      </label>
      {aplicar.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(aplicar.error).mensaje}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          className="min-h-11"
          disabled={aplicar.isPending || detalle.trim().length < 10}
        >
          <ShieldCheck className="mr-2 size-4" />
          {aplicar.isPending ? 'Enviando…' : 'Aplicar garantía'}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
