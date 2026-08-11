import type { PropsWithChildren } from 'react'
import { LanguageSwitcher } from '@/components/molecules/language-switcher'
import { useI18n } from '@/lib/i18n'

export function AppShell({ children }: PropsWithChildren) {
  const { t } = useI18n()
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center justify-between gap-4 font-semibold">
          {t('appName')}
          <LanguageSwitcher />
        </div>
      </header>
      <main className="container py-12">{children}</main>
    </div>
  )
}
