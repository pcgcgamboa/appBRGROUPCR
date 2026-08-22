import { Bell, ChartPie, ClipboardList, MapPinned } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { useCantidadNotificacionesPendientes } from '@/features/notificaciones/hooks/use-notificaciones-internas'

type Seccion = 'home' | 'solicitudes' | 'rutas' | 'notificaciones' | 'reportes'

export function EncargadoDashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const notificacionesPendientes = useCantidadNotificacionesPendientes().cantidad
  const seccion = (location.pathname.split('/')[2] || 'home') as Seccion

  return (
    <Tabs
      value={seccion}
      onValueChange={(value) => navigate(`/encargado/${value}`)}
      className="space-y-6"
    >
      <NavLink
        to="/encargado/home"
        className="rounded-md text-sm font-bold uppercase tracking-wider text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Gestión del proceso
      </NavLink>
      <TabsList aria-label="Gestión del proceso">
        <TabsTrigger value="solicitudes">
          <ClipboardList className="mr-2 size-4" />
          Solicitudes
        </TabsTrigger>
        <TabsTrigger value="rutas">
          <MapPinned className="mr-2 size-4" />
          Control de ruta
        </TabsTrigger>
        <TabsTrigger value="notificaciones">
          <Bell className="mr-2 size-4" />
          Notificaciones
          {notificacionesPendientes > 0 && (
            <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
              {notificacionesPendientes > 99 ? '99+' : notificacionesPendientes}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="reportes">
          <ChartPie className="mr-2 size-4" />
          Reportes
        </TabsTrigger>
      </TabsList>
      <Outlet />
    </Tabs>
  )
}
