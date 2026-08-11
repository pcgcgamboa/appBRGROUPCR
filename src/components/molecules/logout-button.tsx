import { LogOut } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  return (
    <Button
      variant="outline"
      className={cn('justify-start text-red-700', compact && 'px-0')}
      title={compact ? t('signOut') : undefined}
      onClick={() => void supabase?.auth.signOut()}
    >
      <LogOut className={cn('size-4 shrink-0', !compact && 'mr-2')} />
      <span className={cn(compact && 'sr-only')}>{t('signOut')}</span>
    </Button>
  )
}
