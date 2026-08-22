import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AvanceResumen,
  RegistrarAvanceInput,
  SolicitudOperador,
} from '@/features/operador/types/operador.types'

export function useSolicitudesOperador(usuarioId?: string) {
  return useQuery({
    queryKey: ['solicitudes-operador', usuarioId],
    enabled: Boolean(usuarioId),
    queryFn: async () => {
      if (!supabase || !usuarioId) throw new Error('No hay sesión de Operador.')
      const { data, error } = await supabase
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, estado, prioridad, cliente:clientes(nombre), tipo:tipos_solicitud(nombre), ruta:rutas(vehiculo_id, vehiculo:vehiculos(placa, tipo), provincia, canton, distrito, otras_senas), peticiones:solicitud_peticiones_resolucion(id, tipo, motivo, estado, creado_en, comentario_resolucion)',
        )
        .eq('operador_id', usuarioId)
        .in('estado', ['asignada', 'en_atencion', 'en_espera_materiales', 'atendida'])
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudOperador[]
    },
  })
}

export function useSolicitarResolucion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      solicitud_id,
      tipo,
      motivo,
    }: {
      solicitud_id: string
      tipo: 'cierre' | 'cancelacion'
      motivo: string
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase.rpc('solicitar_resolucion_solicitud', {
        p_solicitud_id: solicitud_id,
        p_tipo: tipo,
        p_motivo: motivo,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['solicitudes-operador'] }),
  })
}

export function useAvancesSolicitud(solicitudId?: string) {
  return useQuery({
    queryKey: ['avances-operador', solicitudId],
    enabled: Boolean(solicitudId),
    queryFn: async () => {
      if (!supabase || !solicitudId) throw new Error('Seleccione una solicitud.')
      const { data, error } = await supabase
        .from('avances')
        .select(
          'id, horas_trabajadas, porcentaje, narrativa, creado_en, vehiculo:vehiculos(placa), solicitud_materiales(cantidad, material:materiales(nombre, unidad_medida)), adjuntos(id, nombre_archivo, tipo)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as AvanceResumen[]
    },
  })
}

export function useRegistrarAvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: RegistrarAvanceInput) => {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data, error } = await supabase.functions.invoke('registrar-avance', {
        body: input,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error as string)
      return data as { avance_id: string }
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['solicitudes-operador'] }),
        queryClient.invalidateQueries({ queryKey: ['avances-operador', variables.solicitud_id] }),
        queryClient.invalidateQueries({ queryKey: ['solicitudes-admin'] }),
      ])
    },
  })
}
