import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms/sheet'
import { InternalMessagesInbox } from '@/components/organisms/internal-messages-inbox'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { useCantidadMensajesPendientes } from '@/features/mensajeria/hooks/use-mensajeria'
import { useI18n } from '@/lib/i18n'

const ROLES_STAFF = new Set(['administrador', 'encargado', 'operador'])

/**
 * Punto de entrada único a la mensajería interna, igual para los 3 roles de
 * staff — resuelve que Admin/Encargado tienen sub-rutas propias pero
 * Operador es una página plana sin nav interna, sin depender de la
 * estructura de navegación de cada uno. Oculto por completo (no solo por
 * CSS) para cliente/solicitante y mientras no hay sesión.
 */
export function InternalMessagesButton() {
  const { t } = useI18n()
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  const { cantidad } = useCantidadMensajesPendientes()

  const esStaff = perfil.data?.roles.some((rol) => ROLES_STAFF.has(rol)) ?? false
  if (!session || !esStaff) return null

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label={
            cantidad > 0
              ? `${t('internalMessages')}, ${cantidad} ${t('unread')}`
              : t('internalMessages')
          }
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          {cantidad > 0 && (
            <Badge
              variant="destructive"
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 min-w-5 justify-center rounded-full px-1 py-0 text-[0.65rem] leading-5"
            >
              {cantidad > 99 ? '99+' : cantidad}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md sm:max-w-lg">
        <SheetHeader>
          <MessageSquare className="size-5 shrink-0 text-primary" />
          <SheetTitle>{t('internalMessages')}</SheetTitle>
        </SheetHeader>
        <InternalMessagesInbox />
      </SheetContent>
    </Sheet>
  )
}
