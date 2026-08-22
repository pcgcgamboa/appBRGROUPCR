import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MaterialSolicitud {
  id: string
  cantidad: number
  costo_referencial_aplicado: number | null
  creado_en: string
  material: { nombre: string; unidad_medida: string } | null
  registrado_por_usuario: { nombre_completo: string } | null
}

export function useMaterialesSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['materiales-solicitud', solicitudId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('solicitud_materiales')
        .select(
          'id, cantidad, costo_referencial_aplicado, creado_en, material:materiales(nombre, unidad_medida), registrado_por_usuario:usuarios!solicitud_materiales_registrado_por_fkey(nombre_completo)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as MaterialSolicitud[]
    },
  })
}

export function useAgregarMaterialSolicitud() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      solicitud_id,
      material_id,
      cantidad,
      costo_referencial_aplicado,
    }: {
      solicitud_id: string
      material_id: string
      cantidad: number
      costo_referencial_aplicado: number | null
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { error } = await supabase.rpc('agregar_material_solicitud_gestor', {
        p_solicitud_id: solicitud_id,
        p_material_id: material_id,
        p_cantidad: cantidad,
        p_costo_referencial_aplicado: costo_referencial_aplicado,
      })
      if (error) throw error
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['materiales-solicitud', variables.solicitud_id],
        }),
        queryClient.invalidateQueries({ queryKey: ['reporte-costos-materiales'] }),
      ])
    },
  })
}
