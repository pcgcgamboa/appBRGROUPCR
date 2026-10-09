import { Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Skeleton } from '@/components/atoms/skeleton'
import { Textarea } from '@/components/atoms/textarea'
import type { MensajeInterno } from '@/features/mensajeria/hooks/use-mensajeria'
import { cn } from '@/lib/utils'

const formato = new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' })

const ETIQUETA_ROL: Record<string, string> = {
  administrador: 'a Administradores',
  encargado: 'a Encargados',
  operador: 'a Operadores',
}

/**
 * Hilo genérico de mensajería interna: se reusa tanto para la bandeja global
 * (directos/difusión, en `InternalMessagesInbox`) como para las notas de una
 * solicitud (`InternalRequestNotes`) — la diferencia entre esos casos vive en
 * qué datos/mutación le pasa cada consumidor, no en este componente.
 */
export function InternalMessagesThread({
  mensajes,
  isLoading,
  error,
  usuarioActualId,
  onEnviar,
  enviando,
  placeholder = 'Escriba un mensaje…',
  vacio = 'Todavía no hay mensajes.',
  soloLectura = false,
}: {
  mensajes: MensajeInterno[]
  isLoading: boolean
  error: Error | null
  usuarioActualId: string | undefined
  onEnviar: (cuerpo: string) => Promise<void>
  enviando: boolean
  placeholder?: string
  vacio?: string
  /** Oculta el compositor cuando el usuario no tiene permiso de escribir en este hilo (ej. difusión, solo gestores). */
  soloLectura?: boolean
}) {
  const [cuerpo, setCuerpo] = useState('')

  async function enviar() {
    const texto = cuerpo.trim()
    if (!texto) return
    setCuerpo('')
    await onEnviar(texto)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {error.message}
        </p>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          ))
        ) : mensajes.length ? (
          mensajes.map((mensaje) => {
            const esMio = mensaje.remitente_id === usuarioActualId
            return (
              <div key={mensaje.id} className={cn('flex flex-col gap-1', esMio && 'items-end')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                    esMio ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  {mensaje.cuerpo}
                </div>
                <span className="text-xs text-muted-foreground">
                  {esMio ? 'Yo' : (mensaje.remitente?.nombre_completo ?? 'Usuario')}
                  {mensaje.destinatario_rol && ` · ${ETIQUETA_ROL[mensaje.destinatario_rol]}`}
                  {' · '}
                  {formato.format(new Date(mensaje.creado_en))}
                </span>
              </div>
            )
          })
        ) : (
          <p className="text-sm text-muted-foreground">{vacio}</p>
        )}
      </div>
      {!soloLectura && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void enviar()
          }}
        >
          <Textarea
            value={cuerpo}
            onChange={(event) => setCuerpo(event.target.value)}
            placeholder={placeholder}
            rows={2}
            className="min-h-0 flex-1"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void enviar()
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={enviando || !cuerpo.trim()}
            aria-label="Enviar mensaje"
          >
            <Send className="size-4" />
          </Button>
        </form>
      )}
    </div>
  )
}
