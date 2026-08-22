import type { SupabaseClient } from '@supabase/supabase-js'
import type { OperadorRepository } from '@/features/operador/ports/operador-repository'
import type {
  AvanceResumen,
  RegistrarAvanceInput,
  SolicitudOperador,
} from '@/features/operador/types/operador.types'

/**
 * Adaptador concreto de `OperadorRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) throw ...` que ya usaban
 * los hooks.
 */
export function createSupabaseOperadorRepository(
  client: SupabaseClient | null,
): OperadorRepository {
  function requerirCliente(): SupabaseClient {
    if (!client) throw new Error('Supabase no está configurado.')
    return client
  }

  return {
    async solicitudesOperador(usuarioId: string): Promise<SolicitudOperador[]> {
      const { data, error } = await requerirCliente()
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

    async avancesSolicitud(solicitudId: string): Promise<AvanceResumen[]> {
      const { data, error } = await requerirCliente()
        .from('avances')
        .select(
          'id, horas_trabajadas, porcentaje, narrativa, creado_en, vehiculo:vehiculos(placa), solicitud_materiales(cantidad, material:materiales(nombre, unidad_medida)), adjuntos(id, nombre_archivo, tipo)',
        )
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as AvanceResumen[]
    },

    async registrarAvance(input: RegistrarAvanceInput): Promise<{ avance_id: string }> {
      const { data, error } = await requerirCliente().functions.invoke('registrar-avance', {
        body: input,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error as string)
      return data as { avance_id: string }
    },

    async solicitarResolucion(input: {
      solicitud_id: string
      tipo: 'cierre' | 'cancelacion'
      motivo: string
    }): Promise<string> {
      const { data, error } = await requerirCliente().rpc('solicitar_resolucion_solicitud', {
        p_solicitud_id: input.solicitud_id,
        p_tipo: input.tipo,
        p_motivo: input.motivo,
      })
      if (error) throw error
      return data as string
    },
  }
}
