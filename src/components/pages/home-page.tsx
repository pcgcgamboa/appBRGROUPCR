import { LoginForm } from '@/components/organisms/login-form'
import { SessionPanel } from '@/components/organisms/session-panel'
import { SetupOverview } from '@/components/organisms/setup-overview'
import { AppShell } from '@/components/templates/app-shell'
import { useSession } from '@/features/auth/hooks/use-session'
import { supabaseConfigurado } from '@/lib/supabase'

export function HomePage() {
  const { session, cargando } = useSession()

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
          <SessionPanel session={session} />
        ) : (
          <LoginForm />
        )}
      </div>
    </AppShell>
  )
}
