import type { SupabaseClient } from '@supabase/supabase-js'
import type { InventarioRepository } from '@/features/inventario/ports/inventario-repository'
import type {
  AsignacionHerramienta,
  AsignarHerramientaInput,
  DevolverHerramientaInput,
  HerramientaResumen,
  PersonaInventario,
} from '@/features/inventario/types/inventario.types'

export function createSupabaseInventarioRepository(
  client: SupabaseClient | null,
): InventarioRepository {
  function requerido() {
    if (!client) throw new Error('Supabase no está configurado.')
    return client
  }
  return {
    async herramientas() {
      const { data, error } = await requerido()
        .from('materiales')
        .select('id,nombre,numero_activo,activo')
        .eq('categoria', 'herramienta')
        .order('nombre')
      if (error) throw error
      return data as HerramientaResumen[]
    },
    async personas() {
      const { data, error } = await requerido()
        .from('usuarios')
        .select('id,nombre_completo')
        .eq('activo', true)
        .order('nombre_completo')
      if (error) throw error
      return data as PersonaInventario[]
    },
    async asignaciones() {
      const { data, error } = await requerido()
        .from('herramienta_asignaciones')
        .select(
          'id,herramienta_id,usuario_id,asignada_en,devuelta_en,observaciones_entrega,observaciones_devolucion,herramienta:materiales(nombre,numero_activo),usuario:usuarios!herramienta_asignaciones_usuario_id_fkey(nombre_completo),asignador:usuarios!herramienta_asignaciones_asignada_por_fkey(nombre_completo),receptor:usuarios!herramienta_asignaciones_devuelta_por_fkey(nombre_completo)',
        )
        .order('asignada_en', { ascending: false })
      if (error) throw error
      return data as unknown as AsignacionHerramienta[]
    },
    async asignar(input: AsignarHerramientaInput) {
      const { error } = await requerido().rpc('asignar_herramienta', {
        p_herramienta_id: input.herramienta_id,
        p_usuario_id: input.usuario_id,
        p_observaciones: input.observaciones,
      })
      if (error) throw error
    },
    async devolver(input: DevolverHerramientaInput) {
      const { error } = await requerido().rpc('devolver_herramienta', {
        p_asignacion_id: input.asignacion_id,
        p_observaciones: input.observaciones,
      })
      if (error) throw error
    },
  }
}
