import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionToolbar } from '@/components/organisms/session-toolbar'
import { usePerfilActual } from '@/features/auth/hooks/use-perfil-actual'
import { useSession } from '@/features/auth/hooks/use-session'
import { calcularRolesDisponibles } from '@/app/roles-navegacion'

/**
 * Envuelve la página de un rol con el mismo `SessionToolbar` que antes montaba
 * `HomePage` en cada rama. `active` es el rol de la ruta actual; cambiar de
 * rol ahora navega a `/{rol}` en vez de actualizar un `useState`.
 */
export function RoleShell({ rol, children }: { rol: string; children: ReactNode }) {
  const navigate = useNavigate()
  const { session } = useSession()
  const perfil = usePerfilActual(session?.user.id)
  const rolesDisponibles = calcularRolesDisponibles(perfil.data?.roles)

  return (
    <>
      <SessionToolbar
        roles={rolesDisponibles}
        active={rol}
        onChange={(nuevoRol) => navigate(`/${nuevoRol}`)}
      />
      {children}
    </>
  )
}
