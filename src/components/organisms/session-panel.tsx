import type { Session } from '@supabase/supabase-js'
import { Button } from '@/components/atoms/button'
import { supabase } from '@/lib/supabase'

export function SessionPanel({ session }: { session: Session }) {
  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">Sesión activa</p>
      <p className="mt-1 font-semibold">{session.user.email}</p>
      <Button variant="outline" className="mt-5" onClick={() => void supabase?.auth.signOut()}>
        Cerrar sesión
      </Button>
    </section>
  )
}
