import { traducir, traducirError } from '@/lib/i18n'
import { useUiStore } from '@/stores/ui.store'

export type ErrorNormalizado = { mensaje: string; codigo?: string }

// Reconoce la forma de PostgrestError (o cualquier objeto plano con message/code).
function esErrorConMensaje(valor: unknown): valor is { message: string; code?: string } {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'message' in valor &&
    typeof (valor as { message: unknown }).message === 'string'
  )
}

// Reduce un error de cualquier fuente (RPC, Edge Function o JS genérico) a un mensaje traducido.
export function normalizarError(
  error: unknown,
  idioma = useUiStore.getState().idioma,
): ErrorNormalizado {
  // Error de JS estándar, incluye FunctionsHttpError/FunctionsRelayError (extienden Error).
  if (error instanceof Error) return { mensaje: traducirError(error.message, idioma) }
  // Objeto con forma de PostgrestError (message + code) que no es instancia de Error.
  if (esErrorConMensaje(error))
    return { mensaje: traducirError(error.message, idioma), codigo: error.code }
  // Forma no reconocible: mensaje genérico de respaldo.
  return { mensaje: traducir('unexpectedError', idioma) }
}
