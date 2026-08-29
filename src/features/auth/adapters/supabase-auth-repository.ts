import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { AuthRepository } from '@/features/auth/ports/auth-repository'
import type { PerfilActual, PerfilRespuesta } from '@/features/auth/types/auth.types'

/**
 * Adaptador concreto de `AuthRepository` sobre supabase-js. Cada mÃ©todo
 * verifica que el cliente estÃ© configurado (`client` puede ser
ull` cuando
 * las variables de entorno de Supabase no estÃ¡n presentes) para no romper el
 * arranque de la app â€” el chequeo se hace por mÃ©todo, no al construir la
 * instancia, replicando el patrÃ³n `if (!supabase) ...` que ya usaban los
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

    async actualizarFoto(usuarioId: string, archivo: File): Promise<string> {
      if (!client) throw new Error('No hay una sesión activa.')
      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) ||
        archivo.size > 5 * 1024 * 1024
      )
        throw new Error('Seleccione una imagen JPG, PNG o WebP de máximo 5 MB.')
      const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
      const ruta = `${usuarioId}/perfil.${extension}`
      const { error: uploadError } = await client.storage
        .from('perfiles')
        .upload(ruta, archivo, { upsert: true, contentType: archivo.type })
      if (uploadError) throw uploadError
      const { error } = await client.from('usuarios').update({ foto_url: ruta }).eq('id', usuarioId)
      if (error) throw error
      const { data: firma, error: firmaError } = await client.storage
        .from('perfiles')
        .createSignedUrl(ruta, 3600)
      if (firmaError) throw firmaError
      return firma.signedUrl
    },
    async obtenerPerfil(usuarioId: string): Promise<PerfilActual> {
      if (!client) throw new Error('No hay una sesiÃ³n activa.')
      const { data, error } = await client
        .from('usuarios')
        .select(
          'id, nombre_completo, cliente_id, foto_url, usuario_roles!usuario_roles_usuario_id_fkey(roles(codigo))',
        )
        .eq('id', usuarioId)
        .single()
      if (error) throw error
      const perfil = data as unknown as PerfilRespuesta
      let fotoUrl: string | null = null
      if (perfil.foto_url) {
        const { data } = await client.storage
          .from('perfiles')
          .createSignedUrl(perfil.foto_url, 3600)
        fotoUrl = data?.signedUrl ?? null
      }
      return {
        id: perfil.id,
        nombre_completo: perfil.nombre_completo,
        cliente_id: perfil.cliente_id,
        foto_url: fotoUrl,
        roles: perfil.usuario_roles.flatMap((item) =>
          item.roles?.codigo ? [item.roles.codigo] : [],
        ),
      }
    },
  }
}
