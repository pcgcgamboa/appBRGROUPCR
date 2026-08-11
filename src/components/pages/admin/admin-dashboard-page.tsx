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
import { UbicacionesPage } from '@/components/pages/admin/ubicaciones-page'
import { UsuariosPage } from '@/components/pages/admin/usuarios-page'
import { VehiculosPage } from '@/components/pages/admin/vehiculos-page'

const pages: Record<AdminSection, () => React.JSX.Element> = {
  solicitudes: BandejaEncargadoPage,
  rutas: ControlRutasPage,
  notificaciones: NotificacionesPage,
  reportes: ReportesPage,
  clientes: ClientesPage,
  ubicaciones: UbicacionesPage,
  tipos: TiposPage,
  materiales: MaterialesPage,
  vehiculos: VehiculosPage,
  usuarios: UsuariosPage,
  roles: RolesPage,
}

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>('solicitudes')
  const Page = pages[section]
  return (
    <AdminShell section={section} onSectionChange={setSection}>
      <Page />
    </AdminShell>
  )
}
