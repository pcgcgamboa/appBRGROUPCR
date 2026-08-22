import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tecnico } from '@/features/catalogos/types/catalogos.types'
import type {
  AsignarTecnicosInput,
  TecnicosRepository,
  TecnicosSolicitud,
} from '@/features/tecnicos/ports/tecnicos-repository'

/**
 * Adaptador concreto de `TecnicosRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) throw ...` que ya usaba
 * el hook.
 */
export function createSupabaseTecnicosRepository(
  client: SupabaseClient | null,
): TecnicosRepository {
  return {
    async tecnicosSolicitud(solicitudId: string): Promise<TecnicosSolicitud> {
      if (!client) throw new Error('Supabase no está configurado.')
      const [todos, asignados] = await Promise.all([
        client.from('tecnicos').select('*').eq('activo', true).order('nombre_completo'),
        client.from('solicitud_tecnicos').select('tecnico_id').eq('solicitud_id', solicitudId),
      ])
      if (todos.error) throw todos.error
      if (asignados.error) throw asignados.error
      return {
        tecnicos: todos.data as Tecnico[],
        asignados: asignados.data.map((x) => x.tecnico_id),
      }
    },

    async asignarTecnicos({ solicitudId, tecnicos }: AsignarTecnicosInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client.rpc('asignar_tecnicos_solicitud', {
        p_solicitud_id: solicitudId,
        p_tecnicos: tecnicos,
      })
      if (error) throw error
    },
  }
}
