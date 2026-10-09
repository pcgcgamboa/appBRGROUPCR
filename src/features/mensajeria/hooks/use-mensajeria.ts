import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/features/auth/hooks/use-session'
import { mensajeInternoRepository } from '@/features/mensajeria/lib/repository'
import type {
  EnviarMensajeInput,
  MensajeInterno,
} from '@/features/mensajeria/types/mensajeria.types'

export type { MensajeInterno } from '@/features/mensajeria/types/mensajeria.types'

export interface ConversacionDirecta {
  contraparteId: string
  contraparteNombre: string
  ultimoMensaje: MensajeInterno
  noLeidos: number
}

function noLeidoPorMi(mensaje: MensajeInterno, usuarioId: string) {
  return (
    mensaje.remitente_id !== usuarioId &&
    !mensaje.lecturas.some((lectura) => lectura.usuario_id === usuarioId)
  )
}

export function useMensajesDirectos() {
  return useQuery({
    queryKey: ['mensajes-directos'],
    refetchInterval: 30_000,
    queryFn: () => mensajeInternoRepository.listarDirectos(),
  })
}

/** Agrupa `useMensajesDirectos()` por contraparte para la bandeja de "Directos". */
export function useConversacionesDirectas() {
  const { session } = useSession()
  const directos = useMensajesDirectos()
  const usuarioId = session?.user.id
  const conversaciones: ConversacionDirecta[] = []
  if (usuarioId) {
    const porContraparte = new Map<string, ConversacionDirecta>()
    for (const mensaje of directos.data ?? []) {
      const esMio = mensaje.remitente_id === usuarioId
      const contraparteId = (esMio ? mensaje.destinatario_id : mensaje.remitente_id) as string
      const contraparteNombre =
        (esMio ? mensaje.destinatario?.nombre_completo : mensaje.remitente?.nombre_completo) ??
        'Usuario'
      const existente = porContraparte.get(contraparteId)
      const sumaNoLeido = noLeidoPorMi(mensaje, usuarioId) ? 1 : 0
      if (!existente) {
        // listarDirectos() ya viene ordenado desc por creado_en: el primer mensaje
        // que vemos por contraparte es siempre el más reciente de esa conversación.
        porContraparte.set(contraparteId, {
          contraparteId,
          contraparteNombre,
          ultimoMensaje: mensaje,
          noLeidos: sumaNoLeido,
        })
      } else {
        existente.noLeidos += sumaNoLeido
      }
    }
    conversaciones.push(...porContraparte.values())
  }
  return { ...directos, conversaciones }
}

export function useMensajesConContraparte(contraparteId: string | undefined) {
  const directos = useMensajesDirectos()
  const mensajes = (directos.data ?? [])
    .filter((m) => m.remitente_id === contraparteId || m.destinatario_id === contraparteId)
    .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
  return { ...directos, mensajes }
}

export function useMensajesDifusion() {
  return useQuery({
    queryKey: ['mensajes-difusion'],
    refetchInterval: 30_000,
    queryFn: () => mensajeInternoRepository.listarDifusiones(),
  })
}

export function useMensajesSolicitud(solicitudId: string | undefined) {
  return useQuery({
    queryKey: ['mensajes-solicitud', solicitudId],
    enabled: Boolean(solicitudId),
    // Cadencia más corta que el resto: es la vista de "hilo abierto".
    refetchInterval: 15_000,
    queryFn: () => mensajeInternoRepository.listarPorSolicitud(solicitudId as string),
  })
}

export function useCantidadMensajesPendientes() {
  const { session } = useSession()
  const directos = useMensajesDirectos()
  const difusiones = useMensajesDifusion()
  const usuarioId = session?.user.id
  const cantidad = usuarioId
    ? [...(directos.data ?? []), ...(difusiones.data ?? [])].filter((m) =>
        noLeidoPorMi(m, usuarioId),
      ).length
    : 0
  return { cantidad, isLoading: directos.isLoading || difusiones.isLoading }
}

export function useEnviarMensaje() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EnviarMensajeInput) => mensajeInternoRepository.enviar(input),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['mensajes-directos'] })
      void qc.invalidateQueries({ queryKey: ['mensajes-difusion'] })
      if (input.solicitudId) {
        void qc.invalidateQueries({ queryKey: ['mensajes-solicitud', input.solicitudId] })
      }
    },
  })
}

export function useMarcarMensajeLeido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mensajeId: string) => mensajeInternoRepository.marcarLeido(mensajeId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mensajes-directos'] })
      void qc.invalidateQueries({ queryKey: ['mensajes-difusion'] })
    },
  })
}
