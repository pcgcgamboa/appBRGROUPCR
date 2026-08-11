import {
  Boxes,
  Bell,
  ChartPie,
  Building2,
  Car,
  ClipboardList,
  MapPin,
  Package,
  Shield,
  Tags,
  Users,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/atoms/button'
import { useI18n, type ClaveTraduccion } from '@/lib/i18n'

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
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside>
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Boxes className="size-5 text-primary" />
          {t('administration')}
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-2 lg:grid" aria-label={t('administration')}>
          {navigation.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={section === id ? 'default' : 'outline'}
              className="shrink-0 justify-start"
              onClick={() => onSectionChange(id)}
            >
              <Icon className="mr-2 size-4" />
              {t(label)}
            </Button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
