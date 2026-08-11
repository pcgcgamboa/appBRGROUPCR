import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Textarea } from '@/components/atoms/textarea'
import { useValidarAtencion } from '@/features/cliente/hooks/use-cliente'
import type { SolicitudCliente } from '@/features/cliente/types/cliente.types'

export function ClientValidationForm({
  solicitud,
  onSaved,
}: {
  solicitud: SolicitudCliente
  onSaved: () => void
}) {
  const validar = useValidarAtencion()
  const [satisfecho, setSatisfecho] = useState(solicitud.validacion?.satisfecho ?? true)
  const [comentario, setComentario] = useState(solicitud.validacion?.comentario ?? '')
  async function enviar(event: FormEvent) {
    event.preventDefault()
    await validar.mutateAsync({ solicitud_id: solicitud.id, satisfecho, comentario })
    onSaved()
  }
  return (
    <form onSubmit={enviar} className="space-y-5 rounded-lg border bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold">Validar solicitud #{solicitud.numero}</h2>
        <p className="text-sm text-muted-foreground">{solicitud.nombre}</p>
      </div>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">¿Está satisfecho con la atención?</legend>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="satisfaccion"
              checked={satisfecho}
              onChange={() => setSatisfecho(true)}
            />
            Sí
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="satisfaccion"
              checked={!satisfecho}
              onChange={() => setSatisfecho(false)}
            />
            No
          </label>
        </div>
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
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {validar.error.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="submit" disabled={validar.isPending}>
          {validar.isPending ? 'Guardando…' : 'Enviar validación'}
        </Button>
        <Button type="button" variant="outline" onClick={onSaved}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
