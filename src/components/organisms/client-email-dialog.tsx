import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
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
import { Textarea } from '@/components/atoms/textarea'
import { useGestionarSolicitud } from '@/features/solicitudes/hooks/use-gestionar-solicitud'
import type { SolicitudAdmin } from '@/features/solicitudes/types/solicitudes.types'
import { normalizarError } from '@/lib/errores'

// "Enviar correo al cliente": precarga el mismo texto automático que compone
// _shared/notificaciones.ts y deja editarlo antes de enviar. El destinatario lo decide el servidor
// según Administración → Correo (cliente o cuenta de soporte), igual que antes.
export function ClientEmailDialog({
  solicitud,
  onClose,
}: {
  solicitud: SolicitudAdmin
  onClose: () => void
}) {
  const gestionar = useGestionarSolicitud()
  const estadoLegible = solicitud.estado.replace(/_/g, ' ')
  const [asunto, setAsunto] = useState(`Solicitud #${solicitud.numero}: ${estadoLegible}`)
  const [mensaje, setMensaje] = useState(
    `Hola ${solicitud.cliente?.nombre ?? ''},\n\nLa solicitud #${solicitud.numero} — ${solicitud.nombre} cambió al estado ${estadoLegible}.`,
  )

  async function enviar(event: FormEvent) {
    event.preventDefault()
    await gestionar.mutateAsync({
      accion: 'notificar_cliente',
      solicitud_id: solicitud.id,
      asunto: asunto.trim(),
      mensaje: mensaje.trim(),
    })
    toast.success('El correo al cliente quedó en proceso de envío.')
    onClose()
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar correo al cliente</DialogTitle>
          <DialogDescription>
            Solicitud #{solicitud.numero} · {solicitud.cliente?.nombre ?? 'Cliente'}. Revise y edite
            el contenido antes de enviarlo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Asunto
            <Input
              required
              maxLength={200}
              value={asunto}
              onChange={(event) => setAsunto(event.target.value)}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Mensaje
            <Textarea
              required
              rows={8}
              maxLength={5000}
              value={mensaje}
              onChange={(event) => setMensaje(event.target.value)}
            />
            <span className="text-xs font-normal text-muted-foreground">
              Se envía al correo de contacto del cliente o a la cuenta de soporte, según
              Administración → Correo.
              {solicitud.estado === 'cerrada' &&
                ' Si la solicitud tiene reporte de atención, se adjunta el PDF.'}
            </span>
          </label>
          {gestionar.error && (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
            >
              {normalizarError(gestionar.error).mensaje}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={gestionar.isPending || !asunto.trim() || !mensaje.trim()}
            >
              {gestionar.isPending ? 'Enviando…' : 'Enviar correo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
