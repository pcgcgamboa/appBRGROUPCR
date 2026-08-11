import { Bell, ChartPie, ClipboardList, MapPinned } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { LogoutButton } from '@/components/molecules/logout-button'
import { BandejaEncargadoPage } from '@/components/pages/encargado/bandeja-encargado-page'
import { ControlRutasPage } from '@/components/pages/encargado/control-rutas-page'
import { NotificacionesPage } from '@/components/pages/encargado/notificaciones-page'
import { ReportesPage } from '@/components/pages/reportes/reportes-page'

export function EncargadoDashboardPage() {
  const [section, setSection] = useState<'solicitudes' | 'rutas' | 'notificaciones' | 'reportes'>(
    'solicitudes',
  )
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          className="flex flex-wrap gap-2 rounded-lg border bg-white p-3"
          aria-label="Gestión del proceso"
        >
          <Button
            variant={section === 'solicitudes' ? 'default' : 'outline'}
            onClick={() => setSection('solicitudes')}
          >
            <ClipboardList className="mr-2 size-4" />
            Solicitudes
          </Button>
          <Button
            variant={section === 'rutas' ? 'default' : 'outline'}
            onClick={() => setSection('rutas')}
          >
            <MapPinned className="mr-2 size-4" />
            Control de ruta
          </Button>
          <Button
            variant={section === 'notificaciones' ? 'default' : 'outline'}
            onClick={() => setSection('notificaciones')}
          >
            <Bell className="mr-2 size-4" />
            Notificaciones
          </Button>
          <Button
            variant={section === 'reportes' ? 'default' : 'outline'}
            onClick={() => setSection('reportes')}
          >
            <ChartPie className="mr-2 size-4" />
            Reportes
          </Button>
        </nav>
        <LogoutButton />
      </div>
      {section === 'solicitudes' ? (
        <BandejaEncargadoPage />
      ) : section === 'rutas' ? (
        <ControlRutasPage />
      ) : section === 'notificaciones' ? (
        <NotificacionesPage />
      ) : (
        <ReportesPage />
      )}
    </div>
  )
}
