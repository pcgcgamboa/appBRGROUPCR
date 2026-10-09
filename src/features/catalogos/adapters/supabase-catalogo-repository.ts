import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogoRepository } from '@/features/catalogos/ports/catalogo-repository'
import type {
  DatosFormulario,
  EntidadBase,
  PlantillaReporte,
} from '@/features/catalogos/types/catalogos.types'

const plantillaReportePredeterminada: Omit<PlantillaReporte, 'cliente_id'> = {
  incluir_motivo_visita: true,
  incluir_checklist_condiciones: true,
  incluir_fotos_categorizadas: true,
  incluir_recomendaciones: true,
  categorias_fotos_habilitadas: [
    'estado_inicial',
    'trabajo_en_proceso',
    'resultado_final',
    'placa_serie',
    'otro',
  ],
}

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

    async obtenerPlantillaReporte(clienteId: string): Promise<PlantillaReporte> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('clientes_plantilla_reporte')
        .select(
          'cliente_id, incluir_motivo_visita, incluir_checklist_condiciones, incluir_fotos_categorizadas, incluir_recomendaciones, categorias_fotos_habilitadas',
        )
        .eq('cliente_id', clienteId)
        .maybeSingle()
      if (error) throw error
      return data ?? { cliente_id: clienteId, ...plantillaReportePredeterminada }
    },

    async guardarPlantillaReporte(input: PlantillaReporte): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client
        .from('clientes_plantilla_reporte')
        .upsert(input, { onConflict: 'cliente_id' })
      if (error) throw error
    },
  }
}
