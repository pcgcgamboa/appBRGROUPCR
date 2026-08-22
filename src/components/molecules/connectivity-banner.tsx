import { WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useI18n } from '@/lib/i18n'

export function ConnectivityBanner() {
  const { isOnline } = useNetworkStatus()
  const { t } = useI18n()
  if (isOnline) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-10 flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm font-medium text-warning-soft-foreground shadow-sm"
    >
      <WifiOff className="size-4 shrink-0" />
      {t('offlineBanner')}
    </div>
  )
}
