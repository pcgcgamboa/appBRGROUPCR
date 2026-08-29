import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tecnico } from '@/features/catalogos/types/catalogos.types'
import { nombreSeguro, validarArchivo } from '@/features/operador/lib/adjuntos'
import type {
  AsignarTecnicosInput,
  CrearPostulacionInput,
  PostulacionTecnico,
  TecnicosRepository,
  TecnicosSolicitud,
  TipoDocumentoPostulacion,
} from '@/features/tecnicos/ports/tecnicos-repository'

export function createSupabaseTecnicosRepository(
  client: SupabaseClient | null,
): TecnicosRepository {
  return {
    async tecnicosSolicitud(solicitudId: string): Promise<TecnicosSolicitud> {
      if (!client) throw new Error('Supabase no está configurado.')
      const [todos, asignados] = await Promise.all([
        client.from('tecnicos').select('*').eq('activo', true).order('nombre_completo'),
        client.from('solicitud_tecnicos').select('tecnico_id').eq('solicitud_id', solicitudId),
      ])
      if (todos.error) throw todos.error
      if (asignados.error) throw asignados.error
      return {
        tecnicos: todos.data as Tecnico[],
        asignados: asignados.data.map((item) => item.tecnico_id),
      }
    },

    async asignarTecnicos({ solicitudId, tecnicos }: AsignarTecnicosInput): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client.rpc('asignar_tecnicos_solicitud', {
        p_solicitud_id: solicitudId,
        p_tecnicos: tecnicos,
      })
      if (error) throw error
    },

    async crearPostulacion(input: CrearPostulacionInput): Promise<string> {
      if (!client) throw new Error('Supabase no está configurado.')
      const postulacionId = crypto.randomUUID()
      const tipos = Object.keys(input.documentos) as TipoDocumentoPostulacion[]
      const documentos = []

      for (const tipo of tipos) {
        const archivo = input.documentos[tipo]
        const errorArchivo = validarArchivo(archivo)
        if (errorArchivo) throw new Error(tipo.replace(/_/g, ' ') + ': ' + errorArchivo)
        const ruta = postulacionId + '/' + tipo + '-' + nombreSeguro(archivo.name)
        const subida = await client.storage.from('postulaciones-tecnicos').upload(ruta, archivo, {
          contentType: archivo.type,
          upsert: false,
        })
        if (subida.error) throw subida.error
        documentos.push({
          tipo,
          nombre_archivo: archivo.name,
          ruta_storage: ruta,
          mime_type: archivo.type,
          tamano_bytes: archivo.size,
        })
      }

      const { data, error } = await client.rpc('crear_postulacion_tecnico', {
        p_postulacion_id: postulacionId,
        p_nombre: input.nombre,
        p_identificacion: input.identificacion,
        p_especialidad: input.especialidad,
        p_celular: input.celular,
        p_correo: input.correo,
        p_provincia: input.provincia,
        p_canton: input.canton,
        p_direccion: input.direccion,
        p_experiencia: input.experiencia,
        p_disponibilidad: input.disponibilidad,
        p_pretension_salarial: input.pretensionSalarial,
        p_documentos: documentos,
      })
      if (error) throw error
      return data as string
    },

    async listarPostulacionesPendientes(): Promise<PostulacionTecnico[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('postulaciones_tecnicos')
        .select('*, documentos:postulacion_tecnico_documentos(*)')
        .eq('estado', 'pendiente')
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as PostulacionTecnico[]
    },

    async resolverPostulacion(id: string, aprobar: boolean, comentario: string): Promise<void> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { error } = await client.rpc('resolver_postulacion_tecnico', {
        p_postulacion_id: id,
        p_aprobar: aprobar,
        p_comentario: comentario,
      })
      if (error) throw error
    },

    async obtenerUrlDocumento(ruta: string): Promise<string> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.storage
        .from('postulaciones-tecnicos')
        .createSignedUrl(ruta, 60)
      if (error) throw error
      return data.signedUrl
    },
  }
}
