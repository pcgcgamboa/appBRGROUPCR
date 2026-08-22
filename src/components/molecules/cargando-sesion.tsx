import { LoaderCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

export function CargandoSesion() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-7 animate-spin text-primary" />
      <p className="text-sm">{t('checkingSession')}</p>
    </div>
  )
}
