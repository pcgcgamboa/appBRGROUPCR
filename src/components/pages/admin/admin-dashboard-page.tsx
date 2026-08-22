import { Outlet } from 'react-router-dom'
import { AdminShell } from '@/components/templates/admin-shell'

export function AdminDashboardPage() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
