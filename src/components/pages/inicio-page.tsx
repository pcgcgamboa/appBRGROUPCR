import { Navigate } from 'react-router-dom'
import { AvisoSupabaseNoConfigurado } from '@/components/molecules/aviso-supabase-no-configurado'
import { CargandoSesion } from '@/components/molecules/cargando-sesion'
import { SessionPanel } from '@/components/organisms/session-panel'
import { LoginPage } from '@/components/pages/login-page'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { supabaseConfigurado } from '@/lib/supabase'
import { calcularRolesDisponibles } from '@/app/roles-navegacion'

/**
 * Ruta raíz (`/`). Decide a qué rama de rol redirigir según la sesión y el
 * perfil actual, replicando exactamente la lógica que antes vivía en
 * `HomePage`: mismo orden de prioridad (el primer rol navegable que el
 * perfil devuelva), mismos 3 mensajes de fallback cuando no hay rol
 * asignado (cargando, error, sin roles).
 */
export function InicioPage() {
  const { session, cargando } = useSession()
  const perfil = usePerfilActual(session?.user.id)

  if (cargando) return <CargandoSesion />

  if (!session) {
    return supabaseConfigurado ? <LoginPage /> : <AvisoSupabaseNoConfigurado />
  }

  const rolesDisponibles = calcularRolesDisponibles(perfil.data?.roles)
  const rolActivo = rolesDisponibles[0]

  if (rolActivo) return <Navigate to={`/${rolActivo}`} replace />

  return (
    <div className="mx-auto max-w-md space-y-4">
      <SessionPanel session={session} />
      {perfil.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando permisos…</p>
      ) : perfil.error ? (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          No fue posible consultar el perfil: {perfil.error.message}
        </p>
      ) : (
        <p className="rounded-md bg-primary-soft p-3 text-sm text-primary-soft-foreground">
          La sesión no tiene un módulo asignado. Solicite a un administrador que revise sus roles.
        </p>
      )}
    </div>
  )
}
