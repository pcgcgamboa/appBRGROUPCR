import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CambiarClaveInput,
  UsuariosRepository,
} from '@/features/usuarios/ports/usuarios-repository'
import type { DatosUsuarioAdmin, UsuarioAdmin } from '@/features/usuarios/types/usuarios.types'
import { traducirError } from '@/lib/i18n'

/**
 * Adaptador concreto de `UsuariosRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) throw ...` que ya usaba
 * el hook.
 */
export function createSupabaseUsuariosRepository(
  client: SupabaseClient | null,
): UsuariosRepository {
  async function invocar(accion: string, usuario?: Partial<DatosUsuarioAdmin>) {
    if (!client) throw new Error('Supabase no está configurado.')
    const { data, error } = await client.functions.invoke('admin-users', {
      body: { accion, usuario },
    })
    if (error) {
      const contexto = 'context' in error ? error.context : null
      if (contexto instanceof Response) {
        const detalle = (await contexto
          .clone()
          .json()
          .catch(() => null)) as { error?: string } | null
        if (detalle?.error) throw new Error(traducirError(detalle.error))
      }
      throw error
    }
    if (data?.error) throw new Error(traducirError(data.error as string))
    return data as { usuarios?: UsuarioAdmin[] }
  }

  return {
    async listar(): Promise<UsuarioAdmin[]> {
      return (await invocar('listar')).usuarios ?? []
    },

    async guardar(usuario: DatosUsuarioAdmin): Promise<void> {
      await invocar(usuario.id ? 'actualizar' : 'crear', usuario)
    },

    async eliminar(id: string): Promise<void> {
      await invocar('eliminar', { id })
    },

    async cambiarClave({ id, password }: CambiarClaveInput): Promise<void> {
      await invocar('cambiar_clave', { id, password })
    },
  }
}
