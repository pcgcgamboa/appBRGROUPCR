import { Navigate, Outlet } from 'react-router-dom'
import { CargandoSesion } from '@/components/molecules/cargando-sesion'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { calcularRolesDisponibles } from '@/app/roles-navegacion'

/**
 * Protege un subárbol de rutas que requiere sesión activa. Si la sesión aún
 * se está resolviendo, muestra el mismo indicador que antes mostraba
 * `HomePage` mientras `cargando === true`. Sin sesión, redirige a `/login`.
 */
export function RequireSession() {
  const { session, cargando } = useSession()

  if (cargando) return <CargandoSesion />
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}

/**
 * Protege una rama de rol (`/administrador`, `/encargado`, etc.). Requiere
 * que `RequireSession` ya haya validado que hay sesión activa. Si el rol no
 * está entre los roles navegables del usuario, redirige a `/` — la misma
 * raíz decide entonces a dónde mandarlo (otro rol, o el panel sin módulo
 * asignado), igual que el comportamiento anterior basado en `useState`.
 */
export function RequireRole({ rol }: { rol: string }) {
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)

  if (perfil.isLoading) return <CargandoSesion />

  const rolesDisponibles = calcularRolesDisponibles(perfil.data?.roles)
  if (!rolesDisponibles.includes(rol)) return <Navigate to="/" replace />

  return <Outlet />
}
