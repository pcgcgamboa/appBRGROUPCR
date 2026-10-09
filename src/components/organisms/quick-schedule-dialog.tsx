import { type FormEvent, useState } from 'react'
import { Button } from '@/components/atoms/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { useProgramarSolicitud } from '@/features/flota/hooks/use-flota'
import { useGestionarSolicitud } from '@/features/solicitudes/hooks/use-gestionar-solicitud'
import { useOperadores } from '@/features/solicitudes/hooks/use-operadores'
import type { SolicitudAdmin } from '@/features/solicitudes/types/solicitudes.types'
import { normalizarError } from '@/lib/errores'

// Atajo desde la bandeja: asigna/reasigna el operador responsable y fija su fecha de atención
// (la misma fecha programada que usa Programación → Calendario) sin tener que abrir el panel
// completo de "Gestionar". `gestionar_solicitud` (acción 'asignar') exige prioridad + operador
// juntos — ver supabase/functions/gestionar-solicitud/index.ts — así que ambos campos van en el
// mismo formulario, precargados con los valores actuales de la solicitud.
export function QuickScheduleDialog({
  solicitud,
  onClose,
}: {
  solicitud: SolicitudAdmin
  onClose: () => void
}) {
  const operadores = useOperadores()
  const gestionar = useGestionarSolicitud()
  const programar = useProgramarSolicitud()
  const [operadorId, setOperadorId] = useState(solicitud.operador_id ?? '')
  const [prioridad, setPrioridad] = useState(solicitud.prioridad ?? 'media')
  const [fecha, setFecha] = useState('')

  const error = gestionar.error ?? programar.error
  const enviando = gestionar.isPending || programar.isPending

  async function enviar(event: FormEvent) {
    event.preventDefault()
    await gestionar.mutateAsync({
      accion: 'asignar',
      solicitud_id: solicitud.id,
      operador_id: operadorId,
      prioridad,
    })
    if (fecha) await programar.mutateAsync({ solicitudId: solicitud.id, fecha })
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Operador y fecha de atención</DialogTitle>
          <DialogDescription>
            Solicitud #{solicitud.numero} · {solicitud.nombre}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Operador responsable
            <Select required value={operadorId} onChange={(e) => setOperadorId(e.target.value)}>
              <option value="">Seleccione un operador…</option>
              {operadores.data?.map((operador) => (
                <option key={operador.id} value={operador.id}>
                  {operador.nombre_completo}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Prioridad
            <Select
              required
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as typeof prioridad)}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Fecha de atención (opcional)
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <span className="text-xs font-normal text-muted-foreground">
              Es la misma fecha programada que se ve en Programación → Calendario.
            </span>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
            >
              {normalizarError(error).mensaje}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || !operadorId}>
              {enviando ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
