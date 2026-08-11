import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export function AccountMenu() {
  const { t } = useI18n()
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function cerrar(event: MouseEvent) {
      if (!contenedor.current?.contains(event.target as Node)) setAbierto(false)
    }
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('mousedown', cerrar)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [abierto])

  if (!session) return null
  const nombre = perfil.data?.nombre_completo || session.user.email || t('profile')
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        className="flex h-11 items-center gap-2 rounded-xl border bg-white px-2 shadow-sm transition hover:border-primary/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={t('viewProfile')}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          {iniciales || <UserRound className="size-4" />}
        </span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
      </button>
      {abierto && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-slate-900/10"
        >
          <div className="border-b p-4">
            <p className="truncate font-semibold">{nombre}</p>
            <p className="mt-1 truncate text-sm text-muted-foreground">{session.user.email}</p>
            {!!perfil.data?.roles.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {perfil.data.roles.map((rol) => (
                  <span
                    key={rol}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {rol.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            onClick={() => void supabase?.auth.signOut()}
          >
            <LogOut className="size-4" />
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  )
}
