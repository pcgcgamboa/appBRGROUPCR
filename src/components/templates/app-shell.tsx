import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/molecules/language-switcher'
import { AccountMenu } from '@/components/molecules/account-menu'
import { useMarca } from '@/features/configuracion/hooks/use-marca'
import { useI18n } from '@/lib/i18n'

export function AppShell() {
  const { t } = useI18n()
  const marca = useMarca()

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (favicon && marca.data?.icono_url) favicon.href = marca.data.icono_url
  }, [marca.data?.icono_url])
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.07),_transparent_32rem)]">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>
      <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 font-bold tracking-tight">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card p-1 shadow-sm">
              <img src={marca.data?.icono_url} alt="" className="size-full object-contain" />
            </span>
            <span className="truncate">{t('appName')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <AccountMenu />
          </div>
        </div>
      </header>
      <main
        id="contenido-principal"
        tabIndex={-1}
        className="container py-3 sm:py-5 focus:outline-none"
      >
        <Outlet />
      </main>
    </div>
  )
}
