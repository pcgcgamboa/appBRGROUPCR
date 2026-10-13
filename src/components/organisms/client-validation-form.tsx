import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Textarea } from '@/components/atoms/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/atoms/radio-group'
import { useValidarAtencion } from '@/features/cliente/hooks/use-cliente'
import type { SolicitudCliente } from '@/features/cliente/types/cliente.types'
import { normalizarError } from '@/lib/errores'

export function ClientValidationForm({
  solicitud,
  onSaved,
  onCancel = onSaved,
}: {
  solicitud: Pick<SolicitudCliente, 'id' | 'numero' | 'nombre' | 'validacion'>
  onSaved: () => void
  onCancel?: () => void
}) {
  const validar = useValidarAtencion()
  const [satisfecho, setSatisfecho] = useState(solicitud.validacion?.satisfecho ?? true)
  const [comentario, setComentario] = useState(solicitud.validacion?.comentario ?? '')
  const [calificacion, setCalificacion] = useState(solicitud.validacion?.calificacion ?? 5)
  const [llegoATiempo, setLlegoATiempo] = useState(solicitud.validacion?.llego_a_tiempo ?? true)
  const [recomendariaTecnico, setRecomendariaTecnico] = useState(
    solicitud.validacion?.recomendaria_tecnico ?? true,
  )
  async function enviar(event: FormEvent) {
    event.preventDefault()
    await validar.mutateAsync({
      solicitud_id: solicitud.id,
      satisfecho,
      comentario,
      calificacion,
      llego_a_tiempo: llegoATiempo,
      recomendaria_tecnico: recomendariaTecnico,
    })
    onSaved()
  }
  return (
    <form onSubmit={enviar} className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
      <div>
        <h2 className="font-semibold">Evalúe el servicio · solicitud #{solicitud.numero}</h2>
        <p className="text-sm text-muted-foreground">{solicitud.nombre}</p>
      </div>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">¿Está satisfecho con la atención?</legend>
        <RadioGroup
          className="flex gap-6"
          value={satisfecho ? 'si' : 'no'}
          onValueChange={(value) => setSatisfecho(value === 'si')}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="si" />
            Sí
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" />
            No
          </label>
        </RadioGroup>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">
          ¿Cómo califica la atención recibida? (1 a 5)
        </legend>
        <RadioGroup
          className="flex gap-4"
          value={String(calificacion)}
          onValueChange={(value) => setCalificacion(Number(value))}
        >
          {[1, 2, 3, 4, 5].map((valor) => (
            <label key={valor} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={String(valor)} />
              {valor}
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">¿El técnico llegó a tiempo?</legend>
        <RadioGroup
          className="flex gap-6"
          value={llegoATiempo ? 'si' : 'no'}
          onValueChange={(value) => setLlegoATiempo(value === 'si')}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="si" />
            Sí
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" />
            No
          </label>
        </RadioGroup>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">¿Recomendaría a este técnico?</legend>
        <RadioGroup
          className="flex gap-6"
          value={recomendariaTecnico ? 'si' : 'no'}
          onValueChange={(value) => setRecomendariaTecnico(value === 'si')}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="si" />
            Sí
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="no" />
            No
          </label>
        </RadioGroup>
      </fieldset>
      <label className="grid gap-2 text-sm font-medium">
        Comentarios{!satisfecho && ' (obligatorios)'}
        <Textarea
          required={!satisfecho}
          value={comentario}
          onChange={(event) => setComentario(event.target.value)}
          placeholder="Comparta comentarios sobre la atención recibida…"
        />
      </label>
      {validar.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(validar.error).mensaje}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={validar.isPending}>
          {validar.isPending ? 'Guardando…' : 'Enviar evaluación'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
