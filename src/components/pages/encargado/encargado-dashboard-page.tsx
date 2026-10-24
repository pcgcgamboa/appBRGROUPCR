import { Bell, CalendarDays, ChartPie, ClipboardList } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Tabs, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { CargandoRuta } from '@/components/molecules/cargando-ruta'
import { useCantidadNotificacionesPendientes } from '@/features/notificaciones/hooks/use-notificaciones-internas'

type Seccion = 'home' | 'solicitudes' | 'programacion' | 'notificaciones' | 'reportes'

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
        <TabsTrigger value="programacion">
          <CalendarDays className="mr-2 size-4" />
          Programación
        </TabsTrigger>
        <TabsTrigger value="notificaciones">
          <Bell className="mr-2 size-4" />
          Notificaciones
          {notificacionesPendientes > 0 && (
            <span className="ml-1">
              ({notificacionesPendientes > 99 ? '99+' : notificacionesPendientes}
              <span className="sr-only"> sin leer</span>)
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="reportes">
          <ChartPie className="mr-2 size-4" />
          Reportes
        </TabsTrigger>
      </TabsList>
      <Suspense fallback={<CargandoRuta />}>
        <Outlet />
      </Suspense>
    </Tabs>
  )
}
