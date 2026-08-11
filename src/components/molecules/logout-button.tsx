import { LogOut } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export function LogoutButton() {
  const { t } = useI18n()
  return (
    <Button variant="outline" onClick={() => void supabase?.auth.signOut()}>
      <LogOut className="mr-2 size-4" />
      {t('signOut')}
    </Button>
  )
}
