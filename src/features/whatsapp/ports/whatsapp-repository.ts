import type {
  AdjuntoSubido,
  DestinatarioWhatsapp,
  EnviarWhatsappInput,
  EnviarWhatsappResultado,
  WhatsappEnvio,
} from '@/features/whatsapp/types/whatsapp.types'

/**
 * Puerto del dominio `whatsapp`: define el contrato de acceso a datos sin
 * atarse a Supabase. El envío ocurre en el Edge Function `enviar-whatsapp`,
 * que según `input.modo` llama al bridge local de whatsapp-web.js (ver
 * `whatsapp-bridge/`) o arma un enlace "clic para chatear" — este
 * repositorio solo invoca esa función.
 */
export interface WhatsappRepository {
  enviar(input: EnviarWhatsappInput): Promise<EnviarWhatsappResultado>
  envios(destinatarioTipo: DestinatarioWhatsapp, destinatarioId: string): Promise<WhatsappEnvio[]>
  subirAdjunto(
    destinatarioTipo: DestinatarioWhatsapp,
    destinatarioId: string,
    archivo: File,
  ): Promise<AdjuntoSubido>
}
