import { LogOut } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const logout = useLogout()
  return (
    <Button
      variant="outline"
      className={cn('justify-start text-destructive hover:bg-destructive-soft', compact && 'px-0')}
      title={compact ? t('signOut') : undefined}
      onClick={() => logout.mutate()}
    >
      <LogOut className={cn('size-4 shrink-0', !compact && 'mr-2')} />
      <span className={cn(compact && 'sr-only')}>{t('signOut')}</span>
    </Button>
  )
}
