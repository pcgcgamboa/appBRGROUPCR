import type { SupabaseClient } from '@supabase/supabase-js'
import type { OperadorRepository } from '@/features/operador/ports/operador-repository'
import type {
  ActualizarPerfilTecnicoInput,
  AvanceResumen,
  ContextoSolicitudTecnico,
  HerramientaTecnico,
  PerfilTecnico,
  RegistrarAvanceInput,
  SolicitudOperador,
} from '@/features/operador/types/operador.types'

const BUCKET_ADJUNTOS = 'solicitudes-adjuntos'
const BUCKET_REPORTES = 'reportes-servicio'

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
    async perfilTecnico(usuarioId: string): Promise<PerfilTecnico> {
      const supabase = requerirCliente()
      const { data, error } = await supabase
        .from('usuarios')
        .select('id,nombre_completo,telefono,foto_url')
        .eq('id', usuarioId)
        .single()
      if (error) throw error
      const perfil = data as PerfilTecnico
      if (!perfil.foto_url) return perfil
      const { data: firma } = await supabase.storage
        .from('perfiles')
        .createSignedUrl(perfil.foto_url, 3600)
      return { ...perfil, foto_url: firma?.signedUrl ?? null }
    },

    async actualizarPerfilTecnico(input: ActualizarPerfilTecnicoInput): Promise<void> {
      const { error } = await requerirCliente().rpc('actualizar_perfil_propio', {
        p_nombre_completo: input.nombre_completo,
        p_telefono: input.telefono,
      })
      if (error) throw error
    },

    async herramientasTecnico(usuarioId: string): Promise<HerramientaTecnico[]> {
      const { data, error } = await requerirCliente()
        .from('herramienta_asignaciones')
        .select('id,asignada_en,observaciones_entrega,herramienta:materiales(nombre,numero_activo)')
        .eq('usuario_id', usuarioId)
        .is('devuelta_en', null)
        .order('asignada_en', { ascending: false })
      if (error) throw error
      return data as unknown as HerramientaTecnico[]
    },

    async contextoSolicitudTecnico(solicitudId: string): Promise<ContextoSolicitudTecnico> {
      const { data, error } = await requerirCliente().rpc('obtener_contexto_solicitud_tecnico', {
        p_solicitud_id: solicitudId,
      })
      if (error) throw error
      return data as ContextoSolicitudTecnico
    },

    async solicitudesOperador(usuarioId: string): Promise<SolicitudOperador[]> {
      const { data, error } = await requerirCliente()
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, estado, prioridad, cliente_id, cliente:clientes(nombre), tipo:tipos_solicitud(nombre), equipo:equipos_cliente(nombre, marca, modelo, serie), ruta:rutas(vehiculo_id, vehiculo:vehiculos(placa, tipo), provincia, canton, distrito, otras_senas), peticiones:solicitud_peticiones_resolucion(id, tipo, motivo, estado, creado_en, comentario_resolucion)',
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
          'id, horas_trabajadas, porcentaje, narrativa, creado_en, vehiculo:vehiculos(placa), solicitud_materiales(cantidad, material:materiales(nombre, unidad_medida)), adjuntos(id, nombre_archivo, tipo, ruta_storage, categoria), reporte_atencion:reportes_atencion(hora_llegada, hora_salida, checklist_area_trabajo_segura, checklist_equipo_probado, checklist_cliente_capacitado, checklist_requiere_seguimiento, checklist_notas, estado_equipo_final, recomendaciones, firma_tecnico, firma_cliente, cedula_cliente_firma, ruta_storage_pdf, nombre_archivo_pdf, creado_por)',
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

    async subirAdjunto(rutaStorage: string, archivo: File): Promise<void> {
      const { error } = await requerirCliente()
        .storage.from(BUCKET_ADJUNTOS)
        .upload(rutaStorage, archivo, { contentType: archivo.type, upsert: false })
      if (error) throw error
    },

    async eliminarAdjuntos(rutasStorage: string[]): Promise<void> {
      if (!rutasStorage.length) return
      const { error } = await requerirCliente().storage.from(BUCKET_ADJUNTOS).remove(rutasStorage)
      if (error) throw error
    },

    async urlFirmadaAdjunto(rutaStorage: string): Promise<string> {
      const { data, error } = await requerirCliente()
        .storage.from(BUCKET_ADJUNTOS)
        .createSignedUrl(rutaStorage, 3600)
      if (error) throw error
      return data.signedUrl
    },

    async urlFirmadaReporte(rutaStorage: string): Promise<string> {
      const { data, error } = await requerirCliente()
        .storage.from(BUCKET_REPORTES)
        .createSignedUrl(rutaStorage, 3600)
      if (error) throw error
      return data.signedUrl
    },

    async subirReportePdf(rutaStorage: string, archivo: Blob): Promise<void> {
      const { error } = await requerirCliente()
        .storage.from(BUCKET_REPORTES)
        .upload(rutaStorage, archivo, { contentType: 'application/pdf', upsert: true })
      if (error) throw error
    },

    async completarReportePdf(
      avanceId: string,
      rutaStoragePdf: string,
      nombreArchivoPdf: string,
    ): Promise<void> {
      const { error } = await requerirCliente()
        .from('reportes_atencion')
        .update({ ruta_storage_pdf: rutaStoragePdf, nombre_archivo_pdf: nombreArchivoPdf })
        .eq('avance_id', avanceId)
      if (error) throw error
    },
  }
}
