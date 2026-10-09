import type { SupabaseClient } from '@supabase/supabase-js'
import type { MensajeInternoRepository } from '@/features/mensajeria/ports/mensaje-interno-repository'
import type {
  EnviarMensajeInput,
  MensajeInterno,
} from '@/features/mensajeria/types/mensajeria.types'

const SELECT_MENSAJE =
  'id,remitente_id,destinatario_id,destinatario_rol,solicitud_id,cuerpo,creado_en,' +
  'remitente:usuarios!mensajes_internos_remitente_id_fkey(nombre_completo),' +
  'destinatario:usuarios!mensajes_internos_destinatario_id_fkey(nombre_completo),' +
  'lecturas:mensajes_internos_lecturas(usuario_id,leido_en)'

/**
 * Adaptador concreto de `MensajeInternoRepository` sobre supabase-js. Cada
 * método verifica que el cliente esté configurado (`client` puede ser `null`
 * cuando las variables de entorno de Supabase no están presentes) para no
 * romper el arranque de la app, replicando el patrón `if (!client) throw ...`
 * ya usado en el resto del proyecto. Toda la autorización de quién puede leer
 * o escribir qué vive en las políticas RLS de `mensajes_internos` — este
 * adaptador no valida reglas de negocio por su cuenta.
 */
export function createSupabaseMensajeInternoRepository(
  client: SupabaseClient | null,
): MensajeInternoRepository {
  async function usuarioActualId(): Promise<string> {
    if (!client) throw new Error('Supabase no está configurado.')
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) throw new Error('La sesión no es válida.')
    return data.user.id
  }

  return {
    async listarDirectos(): Promise<MensajeInterno[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const usuarioId = await usuarioActualId()
      const { data, error } = await client
        .from('mensajes_internos')
        .select(SELECT_MENSAJE)
        .or(`remitente_id.eq.${usuarioId},destinatario_id.eq.${usuarioId}`)
        .not('destinatario_id', 'is', null)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as MensajeInterno[]
    },

    async listarDifusiones(): Promise<MensajeInterno[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('mensajes_internos')
        .select(SELECT_MENSAJE)
        .not('destinatario_rol', 'is', null)
        .order('creado_en', { ascending: false })
      if (error) throw error
      return data as unknown as MensajeInterno[]
    },

    async listarPorSolicitud(solicitudId: string): Promise<MensajeInterno[]> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client
        .from('mensajes_internos')
        .select(SELECT_MENSAJE)
        .eq('solicitud_id', solicitudId)
        .order('creado_en', { ascending: true })
      if (error) throw error
      return data as unknown as MensajeInterno[]
    },

    async enviar({ destinatarioId, destinatarioRol, solicitudId, cuerpo }: EnviarMensajeInput) {
      if (!client) throw new Error('Supabase no está configurado.')
      const remitenteId = await usuarioActualId()
      const { error } = await client.from('mensajes_internos').insert({
        remitente_id: remitenteId,
        destinatario_id: destinatarioId ?? null,
        destinatario_rol: destinatarioRol ?? null,
        solicitud_id: solicitudId ?? null,
        cuerpo,
      })
      if (error) throw error
    },

    async marcarLeido(mensajeId: string) {
      if (!client) throw new Error('Supabase no está configurado.')
      const usuarioId = await usuarioActualId()
      const { error } = await client
        .from('mensajes_internos_lecturas')
        .upsert({ mensaje_id: mensajeId, usuario_id: usuarioId })
      if (error) throw error
    },
  }
}
