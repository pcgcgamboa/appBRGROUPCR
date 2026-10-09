import type { RolStaff } from '@/features/usuarios/types/usuarios.types'

export type { RolStaff }

export interface MensajeInterno {
  id: string
  remitente_id: string
  destinatario_id: string | null
  destinatario_rol: RolStaff | null
  solicitud_id: string | null
  cuerpo: string
  creado_en: string
  remitente: { nombre_completo: string } | null
  destinatario: { nombre_completo: string } | null
  lecturas: { usuario_id: string; leido_en: string }[]
}

export interface EnviarMensajeInput {
  destinatarioId?: string
  destinatarioRol?: RolStaff
  solicitudId?: string
  cuerpo: string
}
