import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { CargandoRuta } from '@/components/molecules/cargando-ruta'
import { AdminShell } from '@/components/templates/admin-shell'

export function AdminDashboardPage() {
  return (
    <AdminShell>
      <Suspense fallback={<CargandoRuta />}>
        <Outlet />
      </Suspense>
    </AdminShell>
  )
}
