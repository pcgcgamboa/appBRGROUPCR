import type { Session } from '@supabase/supabase-js'
import type { PerfilActual } from '@/features/auth/types/auth.types'

/**
 * Puerto del dominio `auth`: define el contrato de acceso a datos sin
 * atarse a Supabase. Los hooks de React consumen esta interfaz; el adaptador
 * concreto (`adapters/supabase-auth-repository.ts`) la implementa con
 * supabase-js. Esto permite sustituirla por un fake en pruebas unitarias sin
 * tocar los hooks ni los componentes.
 */
export interface AuthRepository {
  obtenerSesion(): Promise<Session | null>
  suscribirCambiosSesion(callback: (session: Session | null) => void): () => void
  iniciarSesion(email: string, password: string): Promise<void>
  cerrarSesion(): Promise<void>
  obtenerPerfil(usuarioId: string): Promise<PerfilActual>
}
