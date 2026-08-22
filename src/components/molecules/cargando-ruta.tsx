import { LoaderCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

/** Contenido de un `<Suspense>` mientras se descarga el chunk de una ruta con carga diferida. */
export function CargandoRuta() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-6 animate-spin text-primary" />
      <p className="text-sm">{t('loading')}</p>
    </div>
  )
}
