import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)

  useEffect(() => {
    if (!supabase) return

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setCargando(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return { session, cargando }
}
