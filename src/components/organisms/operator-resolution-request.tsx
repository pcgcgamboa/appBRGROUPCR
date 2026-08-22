import { Send, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { useSolicitarResolucion } from '@/features/operador/hooks/use-operador'
import type { SolicitudOperador } from '@/features/operador/types/operador.types'

export function OperatorResolutionRequest({
  solicitud,
  onClose,
}: {
  solicitud: SolicitudOperador
  onClose: () => void
}) {
  const solicitar = useSolicitarResolucion()
  const [tipo, setTipo] = useState<'cierre' | 'cancelacion'>(
    solicitud.estado === 'atendida' ? 'cierre' : 'cancelacion',
  )
  const [motivo, setMotivo] = useState('')

  async function enviar(event: FormEvent) {
    event.preventDefault()
    await solicitar.mutateAsync({ solicitud_id: solicitud.id, tipo, motivo })
    onClose()
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-4 rounded-xl border border-warning/30 bg-warning-soft p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Solicitar decisión del Encargado</h2>
          <p className="mt-1 text-sm text-warning-soft-foreground">
            Solicitud #{solicitud.numero}: {solicitud.nombre}
          </p>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Cerrar">
          <X className="size-4" />
        </Button>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Acción solicitada
        <Select value={tipo} onChange={(event) => setTipo(event.target.value as typeof tipo)}>
          {solicitud.estado === 'atendida' && <option value="cierre">Cerrar solicitud</option>}
          <option value="cancelacion">Cancelar solicitud</option>
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Justificación
        <Textarea
          required
          minLength={5}
          value={motivo}
          placeholder="Explique por qué solicita esta acción…"
          onChange={(event) => setMotivo(event.target.value)}
        />
      </label>
      {solicitar.error && (
        <p role="alert" className="text-sm text-destructive">
          {solicitar.error.message}
        </p>
      )}
      <Button type="submit" disabled={solicitar.isPending || motivo.trim().length < 5}>
        <Send className="mr-2 size-4" />
        {solicitar.isPending ? 'Enviando…' : 'Enviar para aprobación'}
      </Button>
    </form>
  )
}
