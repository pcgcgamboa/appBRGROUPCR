import {
  Boxes,
  Bell,
  ChartPie,
  Building2,
  Car,
  ClipboardList,
  MapPin,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Tags,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { LogoutButton } from '@/components/molecules/logout-button'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { useI18n, type ClaveTraduccion } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui.store'

export type AdminSection =
  | 'solicitudes'
  | 'rutas'
  | 'notificaciones'
  | 'reportes'
  | 'clientes'
  | 'ubicaciones'
  | 'tipos'
  | 'materiales'
  | 'vehiculos'
  | 'usuarios'
  | 'roles'

const navigation: { id: AdminSection; label: ClaveTraduccion; icon: typeof Boxes }[] = [
  { id: 'solicitudes', label: 'requests', icon: ClipboardList },
  { id: 'rutas', label: 'routeControl', icon: MapPin },
  { id: 'notificaciones', label: 'notifications', icon: Bell },
  { id: 'reportes', label: 'reports', icon: ChartPie },
  { id: 'clientes', label: 'clients', icon: Building2 },
  { id: 'ubicaciones', label: 'locations', icon: MapPin },
  { id: 'tipos', label: 'types', icon: Tags },
  { id: 'materiales', label: 'materials', icon: Package },
  { id: 'vehiculos', label: 'vehicles', icon: Car },
  { id: 'usuarios', label: 'users', icon: Users },
  { id: 'roles', label: 'roles', icon: Shield },
]

export function AdminShell({
  section,
  onSectionChange,
  children,
}: {
  section: AdminSection
  onSectionChange: (section: AdminSection) => void
  children: ReactNode
}) {
  const { t } = useI18n()
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  const menuColapsado = useUiStore((state) => state.menuColapsado)
  const cambiarMenuColapsado = useUiStore((state) => state.cambiarMenuColapsado)
  const [perfilVisible, setPerfilVisible] = useState(false)
  return (
    <div
      className={cn(
        'grid gap-6 transition-[grid-template-columns] duration-300 lg:gap-8',
        menuColapsado ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[240px_minmax(0,1fr)]',
      )}
    >
      <aside className="lg:sticky lg:top-24 lg:flex lg:min-h-[calc(100vh-7.5rem)] lg:flex-col">
        <div
          className={cn(
            'mb-3 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground',
            menuColapsado && 'lg:justify-center',
          )}
        >
          <Boxes className="size-5 shrink-0 text-primary" />
          <span className={cn(menuColapsado && 'lg:sr-only')}>{t('administration')}</span>
          <button
            type="button"
            className="ml-auto hidden size-9 items-center justify-center rounded-lg border bg-white text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex"
            aria-label={menuColapsado ? t('expandMenu') : t('collapseMenu')}
            title={menuColapsado ? t('expandMenu') : t('collapseMenu')}
            onClick={cambiarMenuColapsado}
          >
            {menuColapsado ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
        <nav
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:flex-1 lg:auto-rows-min lg:px-0"
          aria-label={t('administration')}
        >
          {navigation.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={section === id ? 'default' : 'outline'}
              className={cn('shrink-0 justify-start lg:w-full', menuColapsado && 'lg:px-0')}
              onClick={() => onSectionChange(id)}
              title={menuColapsado ? t(label) : undefined}
            >
              <Icon className={cn('size-4 shrink-0', !menuColapsado && 'mr-2')} />
              <span className={cn(menuColapsado && 'lg:sr-only')}>{t(label)}</span>
            </Button>
          ))}
        </nav>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:hidden">
          <Button variant="outline" onClick={() => setPerfilVisible(true)}>
            <UserRound className="mr-2 size-4" />
            {t('viewProfile')}
          </Button>
          <LogoutButton />
        </div>
        <div className="mt-4 hidden space-y-2 border-t pt-4 lg:block">
          <Button
            variant="outline"
            className={cn('w-full justify-start', menuColapsado && 'px-0')}
            title={menuColapsado ? t('viewProfile') : undefined}
            onClick={() => setPerfilVisible(true)}
          >
            <UserRound className={cn('size-4 shrink-0', !menuColapsado && 'mr-2')} />
            <span className={cn(menuColapsado && 'sr-only')}>{t('viewProfile')}</span>
          </Button>
          <div className={cn('[&_button]:w-full', menuColapsado && '[&_button]:px-0')}>
            <LogoutButton compact={menuColapsado} />
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
      {perfilVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPerfilVisible(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            className="w-full max-w-md rounded-3xl border bg-white p-6 shadow-2xl sm:p-7"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setPerfilVisible(false)
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="size-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('profile')}</p>
                  <h2 id="profile-title" className="text-xl font-bold">
                    {perfil.data?.nombre_completo || session?.user.email}
                  </h2>
                </div>
              </div>
              <Button
                autoFocus
                variant="outline"
                className="size-10 min-h-10 px-0"
                aria-label={t('close')}
                onClick={() => setPerfilVisible(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <dl className="mt-6 grid gap-4 text-sm">
              <div className="rounded-xl bg-muted p-4">
                <dt className="text-muted-foreground">{t('email')}</dt>
                <dd className="mt-1 break-all font-semibold">{session?.user.email}</dd>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <dt className="text-muted-foreground">{t('assignedRoles')}</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {perfil.data?.roles.map((rol) => (
                    <span
                      key={rol}
                      className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary"
                    >
                      {rol.replace(/_/g, ' ')}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </div>
  )
}
