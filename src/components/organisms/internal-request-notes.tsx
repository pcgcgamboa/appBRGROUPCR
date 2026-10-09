import { Lock } from 'lucide-react'
import { InternalMessagesThread } from '@/components/organisms/internal-messages-thread'
import { useSession } from '@/features/auth/hooks/use-session'
import { useEnviarMensaje, useMensajesSolicitud } from '@/features/mensajeria/hooks/use-mensajeria'

/**
 * Notas internas de una solicitud: staff (gestor + operador asignado)
 * únicamente, nunca visible para el cliente/solicitante aunque este pueda
 * ver el mismo ticket en `RequestCommunications`/`solicitud_comunicaciones`.
 * La política RLS `mensajes_lectura`/`mensajes_crear` de `mensajes_internos`
 * ya hace cumplir esa separación del lado del servidor — este componente
 * solo se monta dentro de páginas de staff (nunca en `solicitante-page.tsx`).
 */
export function InternalRequestNotes({ solicitudId }: { solicitudId: string }) {
  const { session } = useSession()
  const notas = useMensajesSolicitud(solicitudId)
  const enviar = useEnviarMensaje()

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" />
        Solo visible para administración, encargados y el operador asignado — el cliente nunca ve
        esta sección.
      </p>
      <InternalMessagesThread
        mensajes={notas.data ?? []}
        isLoading={notas.isLoading}
        error={notas.error}
        usuarioActualId={session?.user.id}
        enviando={enviar.isPending}
        placeholder="Escriba una nota interna sobre esta solicitud…"
        vacio="Todavía no hay notas internas para esta solicitud."
        onEnviar={(cuerpo) => enviar.mutateAsync({ solicitudId, cuerpo })}
      />
    </div>
  )
}
