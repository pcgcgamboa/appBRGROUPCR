import type { SupabaseClient } from '@supabase/supabase-js'
import type { RutasRepository } from '@/features/rutas/ports/rutas-repository'
import type { ControlRutaInput, SolicitudParaRuta } from '@/features/rutas/types/rutas.types'

/**
 * Adaptador concreto de `RutasRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) throw ...` que ya usaban
 * los hooks.
 */
export function createSupabaseRutasRepository(client: SupabaseClient | null): RutasRepository {
  function requerirCliente(): SupabaseClient {
    if (!client) throw new Error('Supabase no está configurado.')
    return client
  }

  return {
    async solicitudesParaRuta(): Promise<SolicitudParaRuta[]> {
      const { data, error } = await requerirCliente()
        .from('solicitudes')
        .select(
          'id, numero, nombre, estado, operador_id, cliente:clientes(nombre), ubicacion:ubicaciones(provincia, canton, distrito, otras_senas, latitud, longitud), ruta:rutas(solicitud_id, vehiculo_id, provincia, canton, distrito, otras_senas, latitud, longitud, estado_vehiculo, estado_checkpoint, vehiculo:vehiculos(placa, tipo), ruta_operarios(operario_id, estado, operario:usuarios(nombre_completo)))',
        )
        .in('estado', ['asignada', 'en_atencion', 'en_espera_materiales', 'atendida'])
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudParaRuta[]
    },

    async guardarControlRuta(input: ControlRutaInput): Promise<void> {
      const { error } = await requerirCliente().rpc('guardar_control_ruta', {
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
  }
}
