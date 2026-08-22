import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogoRepository } from '@/features/catalogos/ports/catalogo-repository'
import type { DatosFormulario, EntidadBase } from '@/features/catalogos/types/catalogos.types'

/**
 * Adaptador concreto de `CatalogoRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) throw ...` que ya usaba
 * el hook.
 */
export function createSupabaseCatalogoRepository(
  client: SupabaseClient | null,
): CatalogoRepository {
  return {
    async listar<T extends EntidadBase>(tabla: string): Promise<T[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from(tabla)
        .select('*')
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as T[]
    },

    async guardar(
      tabla: string,
      id: string | number | undefined,
      values: DatosFormulario,
    ): Promise<string | number> {
      if (!client) throw new Error('Supabase no está configurado.')
      const consulta = id
        ? client.from(tabla).update(values).eq('id', id).select('id').single()
        : client.from(tabla).insert(values).select('id').single()
      const { data, error } = await consulta
      if (error) throw error
      return data.id as string | number
    },

    async eliminar(tabla: string, id: string | number): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client.from(tabla).delete().eq('id', id)
      if (error) throw error
    },
  }
}
