import { useState } from 'react'
import { AdminShell, type AdminSection } from '@/components/templates/admin-shell'
import { ClientesPage } from '@/components/pages/admin/clientes-page'
import { MaterialesPage } from '@/components/pages/admin/materiales-page'
import { RolesPage } from '@/components/pages/admin/roles-page'
import { SolicitudesAdminPage } from '@/components/pages/admin/solicitudes-admin-page'
import { TiposPage } from '@/components/pages/admin/tipos-page'
import { UbicacionesPage } from '@/components/pages/admin/ubicaciones-page'
import { UsuariosPage } from '@/components/pages/admin/usuarios-page'
import { VehiculosPage } from '@/components/pages/admin/vehiculos-page'

const pages: Record<AdminSection, () => React.JSX.Element> = {
  solicitudes: SolicitudesAdminPage,
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
