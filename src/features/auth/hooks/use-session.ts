import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { authRepository } from '@/features/auth/lib/repository'
import { supabaseConfigurado } from '@/lib/supabase'

export function useSession() {
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

  return { session, cargando }
}
