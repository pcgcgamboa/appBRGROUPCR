import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tecnico } from '@/features/catalogos/types/catalogos.types'
export function useTecnicosSolicitud(solicitudId: string) {
  return useQuery({
    queryKey: ['tecnicos-solicitud', solicitudId],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const [todos, asignados] = await Promise.all([
        supabase.from('tecnicos').select('*').eq('activo', true).order('nombre_completo'),
        supabase.from('solicitud_tecnicos').select('tecnico_id').eq('solicitud_id', solicitudId),
      ])
      if (todos.error) throw todos.error
      if (asignados.error) throw asignados.error
      return {
        tecnicos: todos.data as Tecnico[],
        asignados: asignados.data.map((x) => x.tecnico_id),
      }
    },
  })
}
export function useAsignarTecnicos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ solicitudId, tecnicos }: { solicitudId: string; tecnicos: string[] }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { error } = await supabase.rpc('asignar_tecnicos_solicitud', {
        p_solicitud_id: solicitudId,
        p_tecnicos: tecnicos,
      })
      if (error) throw error
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['tecnicos-solicitud', v.solicitudId] }),
  })
}
