import { useState } from 'react'
import { AdminShell, type AdminSection } from '@/components/templates/admin-shell'
import { ClientesPage } from '@/components/pages/admin/clientes-page'
import { MaterialesPage } from '@/components/pages/admin/materiales-page'
import { RolesPage } from '@/components/pages/admin/roles-page'
import { BandejaEncargadoPage } from '@/components/pages/encargado/bandeja-encargado-page'
import { ControlRutasPage } from '@/components/pages/encargado/control-rutas-page'
import { NotificacionesPage } from '@/components/pages/encargado/notificaciones-page'
import { ReportesPage } from '@/components/pages/reportes/reportes-page'
import { TiposPage } from '@/components/pages/admin/tipos-page'
import { UsuariosPage } from '@/components/pages/admin/usuarios-page'
import { VehiculosPage } from '@/components/pages/admin/vehiculos-page'
import { MarcaPage } from '@/components/pages/admin/marca-page'
import { ProveedoresPage } from '@/components/pages/admin/proveedores-page'
import { OperationsHomePage } from '@/components/pages/operations-home-page'

const pages: Record<AdminSection, () => React.JSX.Element> = {
  home: () => <></>,
  solicitudes: BandejaEncargadoPage,
  rutas: ControlRutasPage,
  notificaciones: NotificacionesPage,
  reportes: () => <ReportesPage />,
  clientes: ClientesPage,
  tipos: TiposPage,
  materiales: MaterialesPage,
  vehiculos: VehiculosPage,
  usuarios: UsuariosPage,
  proveedores: ProveedoresPage,
  roles: RolesPage,
  marca: MarcaPage,
}

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>('home')
  const Page = pages[section]
  return (
    <AdminShell section={section} onSectionChange={setSection}>
      {section === 'home' ? (
        <OperationsHomePage onOpenSolicitudes={() => setSection('solicitudes')} />
      ) : (
        <Page />
      )}
    </AdminShell>
  )
}
