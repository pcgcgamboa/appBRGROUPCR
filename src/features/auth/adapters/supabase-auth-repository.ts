import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { AuthRepository } from '@/features/auth/ports/auth-repository'
import type { PerfilActual, PerfilRespuesta } from '@/features/auth/types/auth.types'

/**
 * Adaptador concreto de `AuthRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) ...` que ya usaban los
 * hooks y componentes.
 */
export function createSupabaseAuthRepository(client: SupabaseClient | null): AuthRepository {
  return {
    async obtenerSesion(): Promise<Session | null> {
      if (!client) return null
      const { data } = await client.auth.getSession()
      return data.session
    },

    suscribirCambiosSesion(callback: (session: Session | null) => void): () => void {
      if (!client) return () => {}
      const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
        callback(nextSession)
      })
      return () => data.subscription.unsubscribe()
    },

    async iniciarSesion(email: string, password: string): Promise<void> {
      if (!client) return
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw error
    },

    async cerrarSesion(): Promise<void> {
      if (!client) return
      await client.auth.signOut()
    },

    async obtenerPerfil(usuarioId: string): Promise<PerfilActual> {
      if (!client) throw new Error('No hay una sesión activa.')
      const { data, error } = await client
        .from('usuarios')
        .select(
          'id, nombre_completo, cliente_id, usuario_roles!usuario_roles_usuario_id_fkey(roles(codigo))',
        )
        .eq('id', usuarioId)
        .single()
      if (error) throw error
      const perfil = data as unknown as PerfilRespuesta
      return {
        id: perfil.id,
        nombre_completo: perfil.nombre_completo,
        cliente_id: perfil.cliente_id,
        roles: perfil.usuario_roles.flatMap((item) =>
          item.roles?.codigo ? [item.roles.codigo] : [],
        ),
      }
    },
  }
}
