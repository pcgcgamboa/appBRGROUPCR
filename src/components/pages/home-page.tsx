import { LoginForm } from '@/components/organisms/login-form'
import { SessionPanel } from '@/components/organisms/session-panel'
import { SetupOverview } from '@/components/organisms/setup-overview'
import { AdminDashboardPage } from '@/components/pages/admin/admin-dashboard-page'
import { AppShell } from '@/components/templates/app-shell'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { supabaseConfigurado } from '@/lib/supabase'

export function HomePage() {
  const { session, cargando } = useSession()
  const perfil = usePerfilActual(session?.user.id)

  if (session && perfil.data?.roles.includes('administrador')) {
    return (
      <AppShell>
        <AdminDashboardPage />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">Fase 0</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Base técnica configurada</h1>
        <p className="mt-4 text-muted-foreground">
          El proyecto está listo para modelar autenticación, roles y datos en Supabase.
        </p>
      </div>
      <SetupOverview />
      <div className="mt-8 max-w-md">
        {!supabaseConfigurado ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
            Copie <code>.env.example</code> como <code>.env.local</code> y configure las
            credenciales de Supabase para habilitar la autenticación.
          </div>
        ) : cargando ? (
          <p className="text-sm text-muted-foreground">Comprobando sesión…</p>
        ) : session ? (
          <div className="space-y-4">
            <SessionPanel session={session} />
            {perfil.isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando permisos…</p>
            ) : (
              <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                La sesión no tiene el rol Administrador. Los demás módulos se habilitarán en sus
                fases correspondientes.
              </p>
            )}
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </AppShell>
  )
}
