import { Languages } from 'lucide-react'
import { Select } from '@/components/atoms/select'
import { useI18n } from '@/lib/i18n'
import type { Idioma } from '@/stores/ui.store'

export function LanguageSwitcher() {
  const { idioma, cambiarIdioma, t } = useI18n()

  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <Languages className="size-4 text-primary" />
      <span className="sr-only">{t('language')}</span>
      <Select
        className="h-9 w-auto"
        value={idioma}
        aria-label={t('language')}
        onChange={(event) => cambiarIdioma(event.target.value as Idioma)}
      >
        <option value="es">{t('spanish')}</option>
        <option value="en">{t('english')}</option>
      </Select>
    </label>
  )
}
