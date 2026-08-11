import {
  Boxes,
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
import { LogoutButton } from '@/components/molecules/logout-button'

export type AdminSection =
  | 'solicitudes'
  | 'rutas'
  | 'clientes'
  | 'ubicaciones'
  | 'tipos'
  | 'materiales'
  | 'vehiculos'
  | 'usuarios'
  | 'roles'

const navigation: { id: AdminSection; label: string; icon: typeof Boxes }[] = [
  { id: 'solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { id: 'rutas', label: 'Control de ruta', icon: MapPin },
  { id: 'clientes', label: 'Clientes', icon: Building2 },
  { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
  { id: 'tipos', label: 'Tipos', icon: Tags },
  { id: 'materiales', label: 'Materiales', icon: Package },
  { id: 'vehiculos', label: 'Vehículos', icon: Car },
  { id: 'usuarios', label: 'Usuarios', icon: Users },
  { id: 'roles', label: 'Roles', icon: Shield },
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
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside>
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Boxes className="size-5 text-primary" />
          Administración
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-2 lg:grid" aria-label="Administración">
          {navigation.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={section === id ? 'default' : 'outline'}
              className="shrink-0 justify-start"
              onClick={() => onSectionChange(id)}
            >
              <Icon className="mr-2 size-4" />
              {label}
            </Button>
          ))}
        </nav>
        <div className="mt-5">
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
