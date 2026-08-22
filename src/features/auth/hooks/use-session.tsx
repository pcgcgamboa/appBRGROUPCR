import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { authRepository } from '@/features/auth/lib/repository'
import { supabaseConfigurado } from '@/lib/supabase'

interface EstadoSesion {
  session: Session | null
  cargando: boolean
}

const SessionContext = createContext<EstadoSesion | null>(null)

/**
 * Única suscripción real a la sesión de Supabase para toda la app — se monta una sola vez en
 * `AppProviders`. Antes, `useSession()` mantenía su propio `useState`/`useEffect` locales, así
 * que cada uno de sus ~7 sitios de uso (RequireSession, RequireRole, InicioPage, LoginRoute,
 * role-shell, account-menu, bandeja-encargado-page) creaba su propia suscripción independiente,
 * sin estado compartido. Al montar un componente nuevo tras una navegación (p. ej. RequireRole
 * bajo /administrador), esa instancia de useSession() arrancaba desde cero — session: null,
 * cargando: true — aunque otro componente hermano ya tuviera la sesión real resuelta. RequireRole
 * no espera su propio `cargando` antes de decidir (ver route-guards.tsx), así que con `session`
 * todavía en null redirigía por error a "/"; esa redirección desmonta el árbol de rutas y vuelve a
 * montar uno nuevo, cuyo useSession() vuelve a arrancar en null, repitiendo el ciclo
 * indefinidamente (el "Throttling navigation to prevent the browser from hanging" de Chrome).
 * Con un único Provider, todo componente que se monta después ya lee el valor resuelto de
 * inmediato en vez de tener que re-descubrirlo.
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)

  useEffect(() => {
    if (!supabaseConfigurado) return

    void authRepository.obtenerSesion().then((nextSession) => {
      setSession(nextSession)
      setCargando(false)
    })

    return authRepository.suscribirCambiosSesion((nextSession) => {
      setSession(nextSession)
      setCargando(false)
    })
  }, [])

  return <SessionContext.Provider value={{ session, cargando }}>{children}</SessionContext.Provider>
}

/** Lee la sesión ya resuelta por el `SessionProvider` montado en `AppProviders`. */
export function useSession(): EstadoSesion {
  const contexto = useContext(SessionContext)
  if (!contexto) throw new Error('useSession debe usarse dentro de <SessionProvider>.')
  return contexto
}
