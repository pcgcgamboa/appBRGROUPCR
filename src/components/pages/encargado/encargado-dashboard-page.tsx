import { Bell, ChartPie, ClipboardList, MapPinned } from 'lucide-react'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/atoms/tabs'
import { BandejaEncargadoPage } from '@/components/pages/encargado/bandeja-encargado-page'
import { ControlRutasPage } from '@/components/pages/encargado/control-rutas-page'
import { NotificacionesPage } from '@/components/pages/encargado/notificaciones-page'
import { ReportesPage } from '@/components/pages/reportes/reportes-page'
import { OperationsHomePage } from '@/components/pages/operations-home-page'
import { useCantidadNotificacionesPendientes } from '@/features/notificaciones/hooks/use-notificaciones-internas'

type Seccion = 'home' | 'solicitudes' | 'rutas' | 'notificaciones' | 'reportes'

export function EncargadoDashboardPage() {
  const [section, setSection] = useState<Seccion>('home')
  const notificacionesPendientes = useCantidadNotificacionesPendientes().cantidad
  return (
    <Tabs
      value={section}
      onValueChange={(value) => setSection(value as Seccion)}
      className="space-y-6"
    >
      <button
        type="button"
        className="rounded-md text-sm font-bold uppercase tracking-wider text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setSection('home')}
        aria-current={section === 'home' ? 'page' : undefined}
      >
        Gestión del proceso
      </button>
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
      <TabsContent value="home">
        <OperationsHomePage onOpenSolicitudes={() => setSection('solicitudes')} />
      </TabsContent>
      <TabsContent value="solicitudes">
        <BandejaEncargadoPage />
      </TabsContent>
      <TabsContent value="rutas">
        <ControlRutasPage />
      </TabsContent>
      <TabsContent value="notificaciones">
        <NotificacionesPage />
      </TabsContent>
      <TabsContent value="reportes">
        <ReportesPage />
      </TabsContent>
    </Tabs>
  )
}
