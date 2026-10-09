import {
  Boxes,
  Bell,
  ChartPie,
  Building2,
  Car,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Mail,
  Menu,
  Palette,
  Package,
  Truck,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Settings,
  Tags,
  Users,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/atoms/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/atoms/sheet'
import { useI18n, type ClaveTraduccion } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui.store'
import { useCantidadNotificacionesPendientes } from '@/features/notificaciones/hooks/use-notificaciones-internas'

export type AdminSection =
  | 'home'
  | 'solicitudes'
  | 'programacion'
  | 'notificaciones'
  | 'reportes'
  | 'clientes'
  | 'tipos'
  | 'materiales'
  | 'vehiculos'
  | 'usuarios'
  | 'proveedores'
  | 'roles'
  | 'marca'
  | 'correo'

const navigation: { id: AdminSection; label: ClaveTraduccion; icon: typeof Boxes }[] = [
  { id: 'solicitudes', label: 'requests', icon: ClipboardList },
  { id: 'programacion', label: 'scheduling', icon: CalendarDays },
  { id: 'notificaciones', label: 'notifications', icon: Bell },
  { id: 'reportes', label: 'reports', icon: ChartPie },
  { id: 'clientes', label: 'clients', icon: Building2 },
  { id: 'materiales', label: 'materials', icon: Package },
  { id: 'proveedores', label: 'suppliers', icon: Truck },
]

const configurationNavigation: {
  id: AdminSection
  label: ClaveTraduccion
  icon: typeof Boxes
}[] = [
  { id: 'tipos', label: 'types', icon: Tags },
  { id: 'roles', label: 'roles', icon: Shield },
  { id: 'usuarios', label: 'users', icon: Users },
  { id: 'marca', label: 'branding', icon: Palette },
  { id: 'correo', label: 'mail', icon: Mail },
  { id: 'vehiculos', label: 'vehicles', icon: Car },
]

export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const location = useLocation()
  const notificacionesPendientes = useCantidadNotificacionesPendientes().cantidad
  const menuColapsado = useUiStore((state) => state.menuColapsado)
  const cambiarMenuColapsado = useUiStore((state) => state.cambiarMenuColapsado)
  const menuAbierto = useUiStore((state) => state.menuAbierto)
  const cambiarMenu = useUiStore((state) => state.cambiarMenu)
  const section = (location.pathname.split('/')[2] || 'home') as AdminSection
  const configuracionActiva = configurationNavigation.some((item) => item.id === section)
  const [configuracionAbierta, setConfiguracionAbierta] = useState(configuracionActiva)

  function navItems(collapsed: boolean, onNavigate?: () => void) {
    return (
      <>
        {navigation.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            to={`/administrador/${id}`}
            onClick={onNavigate}
            title={collapsed ? t(label) : undefined}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? 'default' : 'outline' }),
                'shrink-0 justify-start lg:w-full',
                collapsed && 'lg:px-0',
              )
            }
          >
            <Icon className={cn('size-4 shrink-0', !collapsed && 'mr-2')} aria-hidden="true" />
            <span className={cn(collapsed && 'lg:sr-only')}>{t(label)}</span>
            {id === 'notificaciones' && notificacionesPendientes > 0 && (
              <>
                <span
                  aria-hidden="true"
                  className="ml-auto grid min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground"
                >
                  {notificacionesPendientes > 99 ? '99+' : notificacionesPendientes}
                </span>
                <span className="sr-only">
                  , {notificacionesPendientes > 99 ? '99+' : notificacionesPendientes} {t('unread')}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <div className="flex shrink-0 flex-col gap-2 lg:grid lg:gap-1">
          <Button
            variant="outline"
            className={cn(
              'shrink-0 justify-start lg:w-full',
              configuracionActiva && 'border-primary/40 bg-primary-soft text-primary',
              collapsed && 'lg:px-0',
            )}
            onClick={() => setConfiguracionAbierta((actual) => !actual)}
            aria-expanded={configuracionAbierta}
            title={collapsed ? t('configuration') : undefined}
          >
            <Settings className={cn('size-4 shrink-0', !collapsed && 'mr-2')} />
            <span className={cn('flex-1 text-left', collapsed && 'lg:sr-only')}>
              {t('configuration')}
            </span>
            <ChevronDown
              className={cn(
                'ml-2 size-4 transition-transform',
                configuracionAbierta && 'rotate-180',
                collapsed && 'lg:hidden',
              )}
            />
          </Button>
          {configuracionAbierta &&
            configurationNavigation.map(({ id, label, icon: Icon }) => (
              <NavLink
                key={id}
                to={`/administrador/${id}`}
                onClick={onNavigate}
                title={collapsed ? t(label) : undefined}
                className={({ isActive }) =>
                  cn(
                    buttonVariants({ variant: isActive ? 'default' : 'outline' }),
                    'shrink-0 justify-start lg:w-full lg:border-l-2 lg:pl-6',
                    collapsed && 'lg:px-0',
                  )
                }
              >
                <Icon className={cn('size-4 shrink-0', !collapsed && 'mr-2')} aria-hidden="true" />
                <span className={cn(collapsed && 'lg:sr-only')}>{t(label)}</span>
              </NavLink>
            ))}
        </div>
      </>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-6 transition-[grid-template-columns] duration-300 lg:gap-8',
        menuColapsado ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[240px_minmax(0,1fr)]',
      )}
    >
      <div className="flex items-center justify-between lg:hidden">
        <Sheet open={menuAbierto} onOpenChange={cambiarMenu}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label={t('administration')}>
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <Boxes className="size-5 shrink-0 text-primary" />
              <SheetTitle>
                <NavLink
                  to="/administrador/home"
                  className="rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => cambiarMenu()}
                  aria-label={t('goToHome')}
                >
                  {t('administration')}
                </NavLink>
              </SheetTitle>
            </SheetHeader>
            <nav
              className="flex flex-1 flex-col gap-2 overflow-y-auto"
              aria-label={t('administration')}
            >
              {navItems(false, () => cambiarMenu())}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <aside className="hidden lg:sticky lg:top-24 lg:flex lg:min-h-[calc(100vh-7.5rem)] lg:flex-col">
        <div
          className={cn(
            'mb-3 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground',
            menuColapsado && 'lg:justify-center',
          )}
        >
          <NavLink
            to="/administrador/home"
            className="flex min-h-9 items-center gap-2 rounded-md text-left transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('goToHome')}
            title={menuColapsado ? t('goToHome') : undefined}
          >
            <Boxes className="size-5 shrink-0 text-primary" />
            <span className={cn(menuColapsado && 'lg:sr-only')}>{t('administration')}</span>
          </NavLink>
          <button
            type="button"
            className="ml-auto hidden size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-sm transition hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
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
          className="lg:grid lg:flex-1 lg:auto-rows-min lg:gap-1"
          aria-label={t('administration')}
        >
          {navItems(menuColapsado)}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
