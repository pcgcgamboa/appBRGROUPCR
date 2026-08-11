import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { SessionToolbar } from '@/components/organisms/session-toolbar'
import { SessionPanel } from '@/components/organisms/session-panel'
import { AdminDashboardPage } from '@/components/pages/admin/admin-dashboard-page'
import { EncargadoDashboardPage } from '@/components/pages/encargado/encargado-dashboard-page'
import { SolicitantePage } from '@/components/pages/solicitante/solicitante-page'
import { OperadorPage } from '@/components/pages/operador/operador-page'
import { ClientePage } from '@/components/pages/cliente/cliente-page'
import { LoginPage } from '@/components/pages/login-page'
import { AppShell } from '@/components/templates/app-shell'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { supabaseConfigurado } from '@/lib/supabase'
import { useI18n } from '@/lib/i18n'

export function HomePage() {
  const { t } = useI18n()
  const { session, cargando } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null)
  const rolesDisponibles =
    perfil.data?.roles.filter((rol) =>
      ['administrador', 'encargado', 'solicitante', 'operador', 'cliente'].includes(rol),
    ) ?? []
  const rolActivo =
    rolSeleccionado && rolesDisponibles.includes(rolSeleccionado)
      ? rolSeleccionado
      : rolesDisponibles[0]

  if (cargando) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-7 animate-spin text-primary" />
          <p className="text-sm">{t('checkingSession')}</p>
        </div>
      </AppShell>
    )
  }

  if (!session) {
    return (
      <AppShell>
        {supabaseConfigurado ? (
          <LoginPage />
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
            Copie <code>.env.example</code> como <code>.env.local</code> y configure las
            credenciales de Supabase para habilitar la autenticación.
          </div>
        )}
      </AppShell>
    )
  }

  if (session && rolActivo === 'administrador') {
    return (
      <AppShell>
        <SessionToolbar roles={rolesDisponibles} active={rolActivo} onChange={setRolSeleccionado} />
        <AdminDashboardPage />
      </AppShell>
    )
  }

  if (session && rolActivo === 'encargado') {
    return (
      <AppShell>
        <SessionToolbar roles={rolesDisponibles} active={rolActivo} onChange={setRolSeleccionado} />
        <EncargadoDashboardPage />
      </AppShell>
    )
  }

  if (session && rolActivo === 'solicitante') {
    return (
      <AppShell>
        <SessionToolbar roles={rolesDisponibles} active={rolActivo} onChange={setRolSeleccionado} />
        <SolicitantePage usuarioId={session.user.id} clienteId={perfil.data?.cliente_id ?? null} />
      </AppShell>
    )
  }

  if (session && rolActivo === 'operador') {
    return (
      <AppShell>
        <SessionToolbar roles={rolesDisponibles} active={rolActivo} onChange={setRolSeleccionado} />
        <OperadorPage usuarioId={session.user.id} />
      </AppShell>
    )
  }

  if (session && rolActivo === 'cliente') {
    return (
      <AppShell>
        <SessionToolbar roles={rolesDisponibles} active={rolActivo} onChange={setRolSeleccionado} />
        <ClientePage clienteId={perfil.data?.cliente_id ?? null} />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-4">
        <SessionPanel session={session} />
        {perfil.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando permisos…</p>
        ) : perfil.error ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            No fue posible consultar el perfil: {perfil.error.message}
          </p>
        ) : (
          <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
            La sesión no tiene un módulo asignado. Solicite a un administrador que revise sus roles.
          </p>
        )}
      </div>
    </AppShell>
  )
}
