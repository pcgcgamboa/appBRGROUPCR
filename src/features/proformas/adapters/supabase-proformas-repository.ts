import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProformasRepository } from '@/features/proformas/ports/proformas-repository'
import type { GuardarProformaInput, Proforma } from '@/features/proformas/types/proformas.types'
export function createSupabaseProformasRepository(
  client: SupabaseClient | null,
): ProformasRepository {
  function requerido() {
    if (!client) throw new Error('Supabase no está configurado.')
    return client
  }
  return {
    async listar(solicitudId) {
      const { data, error } = await requerido()
        .from('proformas')
        .select(
          'id,numero,solicitud_id,titulo,notas,descuento_porcentaje,impuesto_porcentaje,subtotal,descuento,impuesto,total,estado,enviado_en,creado_en,items:proforma_items(id,tipo,origen_id,descripcion,cantidad,unidad,precio_unitario,total,orden)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
        .order('orden', { referencedTable: 'proforma_items', ascending: true })
      if (error) throw error
      return data as unknown as Proforma[]
    },
    async generar(solicitudId) {
      const { data, error } = await requerido().rpc('generar_proforma_solicitud', {
        p_solicitud_id: solicitudId,
      })
      if (error) throw error
      return data as string
    },
    async guardar(input: GuardarProformaInput) {
      const { error } = await requerido().rpc('guardar_proforma', {
        p_proforma_id: input.id,
        p_titulo: input.titulo,
        p_notas: input.notas,
        p_descuento: input.descuento,
        p_impuesto: input.impuesto,
        p_items: input.items.map((item, index) => ({ ...item, orden: index + 1 })),
      })
      if (error) throw error
    },
    async enviar(id) {
      const { error } = await requerido().rpc('enviar_proforma', { p_proforma_id: id })
      if (error) throw error
    },
  }
}
