import type { SupabaseClient } from '@supabase/supabase-js'
import type { WhatsappRepository } from '@/features/whatsapp/ports/whatsapp-repository'
import type {
  AdjuntoSubido,
  DestinatarioWhatsapp,
  EnviarWhatsappInput,
  EnviarWhatsappResultado,
  WhatsappEnvio,
} from '@/features/whatsapp/types/whatsapp.types'

export function createSupabaseWhatsappRepository(
  client: SupabaseClient | null,
): WhatsappRepository {
  return {
    async enviar(input: EnviarWhatsappInput): Promise<EnviarWhatsappResultado> {
      if (!client) throw new Error('Supabase no está configurado.')
      const { data, error } = await client.functions.invoke('enviar-whatsapp', { body: input })
      if (error) {
        const contexto = 'context' in error ? error.context : null
        if (contexto instanceof Response) {
          const detalle = (await contexto
            .clone()
            .json()
            .catch(() => null)) as { error?: string } | null
          if (detalle?.error) throw new Error(detalle.error)
        }
        throw error
      }
      if (data?.error) throw new Error(data.error as string)
      return { url: data?.url as string | undefined }
    },

    async envios(
      destinatarioTipo: DestinatarioWhatsapp,
      destinatarioId: string,
    ): Promise<WhatsappEnvio[]> {
      if (!client) return []
      const { data, error } = await client
        .from('whatsapp_envios')
        .select(
          'id, tipo, telefono, mensaje, documento_nombre, resultado, detalle_error, creado_en',
        )
        .eq('destinatario_tipo', destinatarioTipo)
        .eq('destinatario_id', destinatarioId)
        .order('creado_en', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as WhatsappEnvio[]
    },

    async subirAdjunto(
      destinatarioTipo: DestinatarioWhatsapp,
      destinatarioId: string,
      archivo: File,
    ): Promise<AdjuntoSubido> {
      if (!client) throw new Error('Supabase no está configurado.')
      const id = crypto.randomUUID()
      const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const ruta = `${destinatarioTipo}/${destinatarioId}/${id}-${nombreSeguro}`
      const { error } = await client.storage.from('whatsapp-adjuntos').upload(ruta, archivo)
      if (error) throw error
      return { ruta_storage: ruta, nombre_archivo: archivo.name }
    },
  }
}
