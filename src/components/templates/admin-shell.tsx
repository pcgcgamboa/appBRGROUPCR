import {
  Boxes,
  Bell,
  ChartPie,
  Building2,
  Car,
  ChevronDown,
  ClipboardList,
  MapPin,
  Palette,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Settings,
  Tags,
  Users,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { useI18n, type ClaveTraduccion } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui.store'

export type AdminSection =
  | 'solicitudes'
  | 'rutas'
  | 'notificaciones'
  | 'reportes'
  | 'clientes'
  | 'tipos'
  | 'materiales'
  | 'vehiculos'
  | 'usuarios'
  | 'roles'
  | 'marca'

const navigation: { id: AdminSection; label: ClaveTraduccion; icon: typeof Boxes }[] = [
  { id: 'solicitudes', label: 'requests', icon: ClipboardList },
  { id: 'rutas', label: 'routeControl', icon: MapPin },
  { id: 'notificaciones', label: 'notifications', icon: Bell },
  { id: 'reportes', label: 'reports', icon: ChartPie },
  { id: 'clientes', label: 'clients', icon: Building2 },
  { id: 'materiales', label: 'materials', icon: Package },
  { id: 'vehiculos', label: 'vehicles', icon: Car },
  { id: 'usuarios', label: 'users', icon: Users },
]

const configurationNavigation: {
  id: AdminSection
  label: ClaveTraduccion
  icon: typeof Boxes
}[] = [
  { id: 'tipos', label: 'types', icon: Tags },
  { id: 'roles', label: 'roles', icon: Shield },
  { id: 'marca', label: 'branding', icon: Palette },
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
  const menuColapsado = useUiStore((state) => state.menuColapsado)
  const cambiarMenuColapsado = useUiStore((state) => state.cambiarMenuColapsado)
  const configuracionActiva = configurationNavigation.some((item) => item.id === section)
  const [configuracionAbierta, setConfiguracionAbierta] = useState(configuracionActiva)
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
          <div className="flex shrink-0 gap-2 lg:grid lg:gap-1">
            <Button
              variant="outline"
              className={cn(
                'shrink-0 justify-start lg:w-full',
                configuracionActiva && 'border-primary/40 bg-blue-50 text-primary',
                menuColapsado && 'lg:px-0',
              )}
              onClick={() => setConfiguracionAbierta((actual) => !actual)}
              aria-expanded={configuracionAbierta}
              title={menuColapsado ? t('configuration') : undefined}
            >
              <Settings className={cn('size-4 shrink-0', !menuColapsado && 'mr-2')} />
              <span className={cn('flex-1 text-left', menuColapsado && 'lg:sr-only')}>
                {t('configuration')}
              </span>
              <ChevronDown
                className={cn(
                  'ml-2 size-4 transition-transform',
                  configuracionAbierta && 'rotate-180',
                  menuColapsado && 'lg:hidden',
                )}
              />
            </Button>
            {configuracionAbierta &&
              configurationNavigation.map(({ id, label, icon: Icon }) => (
                <Button
                  key={id}
                  variant={section === id ? 'default' : 'outline'}
                  className={cn(
                    'shrink-0 justify-start lg:w-full lg:border-l-2 lg:pl-6',
                    menuColapsado && 'lg:px-0',
                  )}
                  onClick={() => onSectionChange(id)}
                  title={menuColapsado ? t(label) : undefined}
                >
                  <Icon className={cn('size-4 shrink-0', !menuColapsado && 'mr-2')} />
                  <span className={cn(menuColapsado && 'lg:sr-only')}>{t(label)}</span>
                </Button>
              ))}
          </div>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
