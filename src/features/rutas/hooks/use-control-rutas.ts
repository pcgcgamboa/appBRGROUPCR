import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ControlRutaInput, SolicitudParaRuta } from '@/features/rutas/types/rutas.types'

export function useSolicitudesParaRuta() {
  return useQuery({
    queryKey: ['solicitudes-rutas'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase
        .from('solicitudes')
        .select(
          'id, numero, nombre, estado, operador_id, cliente:clientes(nombre), ubicacion:ubicaciones(provincia, canton, distrito, otras_senas, latitud, longitud), ruta:rutas(solicitud_id, vehiculo_id, provincia, canton, distrito, otras_senas, latitud, longitud, estado_vehiculo, estado_checkpoint, vehiculo:vehiculos(placa, tipo), ruta_operarios(operario_id, estado, operario:usuarios(nombre_completo)))',
        )
        .in('estado', ['asignada', 'en_atencion', 'en_espera_materiales', 'atendida'])
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudParaRuta[]
    },
  })
}

export function useGuardarControlRuta() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ControlRutaInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { error } = await supabase.rpc('guardar_control_ruta', {
        p_solicitud_id: input.solicitud_id,
        p_vehiculo_id: input.vehiculo_id,
        p_provincia: input.provincia,
        p_canton: input.canton,
        p_distrito: input.distrito,
        p_otras_senas: input.otras_senas,
        p_latitud: input.latitud,
        p_longitud: input.longitud,
        p_estado_vehiculo: input.estado_vehiculo,
        p_estado_checkpoint: input.estado_checkpoint,
        p_operarios: input.operarios,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-rutas'] }),
  })
}
