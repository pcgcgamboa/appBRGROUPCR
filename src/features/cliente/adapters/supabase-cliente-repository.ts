import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ClienteRepository,
  SubirDocumentoInput,
  ValidarAtencionInput,
} from '@/features/cliente/ports/cliente-repository'
import type {
  DocumentoCliente,
  SolicitudCliente,
  TrackingCliente,
} from '@/features/cliente/types/cliente.types'

/**
 * Adaptador concreto de `ClienteRepository` sobre supabase-js. Cada método
 * verifica que el cliente esté configurado (`client` puede ser `null` cuando
 * las variables de entorno de Supabase no están presentes) para no romper el
 * arranque de la app — el chequeo se hace por método, no al construir la
 * instancia, replicando el patrón `if (!supabase) ...` que ya usaban los
 * hooks.
 */
export function createSupabaseClienteRepository(client: SupabaseClient | null): ClienteRepository {
  return {
    async solicitudesAtendidas(clienteId?: string | null): Promise<SolicitudCliente[]> {
      if (!client || !clienteId) return []
      const { data, error } = await client
        .from('solicitudes')
        .select(
          'id, numero, nombre, detalle, estado, atendida_en, cerrada_en, tipo:tipos_solicitud(nombre), operador:usuarios!solicitudes_operador_id_fkey(nombre_completo), avances(reportes_atencion(ruta_storage_pdf, nombre_archivo_pdf)), validacion:validaciones_cierre(satisfecho, comentario, calificacion, llego_a_tiempo, recomendaria_tecnico, validado_en)',
        )
        .eq('cliente_id', clienteId)
        .in('estado', ['atendida', 'cerrada'])
        .order('atendida_en', { ascending: false })
      if (error) throw error
      return data as unknown as SolicitudCliente[]
    },

    async validarAtencion({
      solicitud_id,
      satisfecho,
      comentario,
      calificacion,
      llego_a_tiempo,
      recomendaria_tecnico,
    }: ValidarAtencionInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const { error } = await client.from('validaciones_cierre').upsert(
        {
          solicitud_id,
          cliente_usuario_id: auth.user.id,
          satisfecho,
          comentario: comentario.trim() || null,
          calificacion,
          llego_a_tiempo,
          recomendaria_tecnico,
          validado_en: new Date().toISOString(),
        },
        { onConflict: 'solicitud_id' },
      )
      if (error) throw error
    },

    async documentos(clienteId: string): Promise<DocumentoCliente[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('cliente_documentos')
        .select(
          'id,cliente_id,tipo,nombre,descripcion,fecha_documento,nombre_archivo,ruta_storage,mime_type,tamano_bytes,creado_en,usuario:usuarios!cliente_documentos_subido_por_fkey(nombre_completo)',
        )
        .eq('cliente_id', clienteId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return Promise.all(
        (data as unknown as DocumentoCliente[]).map(async (documento) => {
          const { data: enlace } = await client.storage
            .from('clientes-documentos')
            .createSignedUrl(documento.ruta_storage, 3600)
          return { ...documento, url: enlace?.signedUrl }
        }),
      )
    },

    async subirDocumento(input: SubirDocumentoInput): Promise<string> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('La sesión no es válida.')
      const id = crypto.randomUUID()
      const seguro = input.archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const ruta = `${input.clienteId}/${id}/${seguro}`
      const carga = await client.storage.from('clientes-documentos').upload(ruta, input.archivo)
      if (carga.error) throw carga.error
      const { error } = await client.from('cliente_documentos').insert({
        id,
        cliente_id: input.clienteId,
        tipo: input.tipo,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion.trim() || null,
        fecha_documento: input.fecha || null,
        nombre_archivo: input.archivo.name,
        ruta_storage: ruta,
        mime_type: input.archivo.type,
        tamano_bytes: input.archivo.size,
        subido_por: auth.user.id,
      })
      if (error) {
        await client.storage.from('clientes-documentos').remove([ruta])
        throw error
      }
      return input.clienteId
    },

    async eliminarDocumento(documento: DocumentoCliente): Promise<string> {
      if (!client) throw new Error('Supabase no está configurado.')
      const storage = await client.storage
        .from('clientes-documentos')
        .remove([documento.ruta_storage])
      if (storage.error) throw storage.error
      const { error } = await client.from('cliente_documentos').delete().eq('id', documento.id)
      if (error) throw error
      return documento.cliente_id
    },

    async urlFirmadaReporte(rutaStorage: string): Promise<string> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.storage
        .from('reportes-servicio')
        .createSignedUrl(rutaStorage, 3600)
      if (error) throw error
      return data.signedUrl
    },

    async tracking(clienteId: string | null): Promise<TrackingCliente[]> {
      if (!client || !clienteId) return []
      const { data: solicitudes, error: solicitudesError } = await client
        .from('solicitudes')
        .select('id')
        .eq('cliente_id', clienteId)
      if (solicitudesError) throw solicitudesError
      if (!solicitudes.length) return []
      const { data, error } = await client
        .from('solicitud_actividades')
        .select(
          'id,solicitud_id,tipo,titulo,descripcion,creado_en,solicitud:solicitudes(numero,nombre),actor:usuarios!solicitud_actividades_actor_id_fkey(nombre_completo)',
        )
        .in(
          'solicitud_id',
          solicitudes.map((x) => x.id),
        )
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as TrackingCliente[]
    },
  }
}
