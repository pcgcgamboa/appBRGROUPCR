import type { Session } from '@supabase/supabase-js'
import { Button } from '@/components/atoms/button'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export function SessionPanel({ session }: { session: Session }) {
  const { t } = useI18n()
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{t('activeSession')}</p>
      <p className="mt-1 font-semibold">{session.user.email}</p>
      <Button variant="outline" className="mt-5" onClick={() => void supabase?.auth.signOut()}>
        {t('signOut')}
      </Button>
    </section>
  )
}
