import { useEffect, useRef } from 'react'
import { borrarBorrador, escribirBorrador, leerBorrador } from '@/lib/local-storage-draft'
import type { MaterialAvanceInput } from '@/features/operador/types/operador.types'
import type { EstadoSolicitud } from '@/features/solicitudes/types/solicitudes.types'

const VERSION = 1
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000
const CLAVE_ULTIMA_ABIERTA = 'srs:avance-draft:last-open'

export interface AvanceDraftCampos {
  horas: string
  porcentaje: string
  estado: EstadoSolicitud
  narrativa: string
  materiales: Omit<MaterialAvanceInput, 'key'>[]
  archivosSeleccionadosCount: number
}

interface AvanceDraftV1 extends AvanceDraftCampos {
  version: 1
  guardadoEn: string
}

function claveBorrador(solicitudId: string) {
  return `srs:avance-draft:v${VERSION}:${solicitudId}`
}

export function leerAvanceDraft(solicitudId: string): AvanceDraftCampos | null {
  const draft = leerBorrador<AvanceDraftV1>(claveBorrador(solicitudId))
  if (!draft || draft.version !== VERSION) return null
  if (Date.now() - new Date(draft.guardadoEn).getTime() > VIGENCIA_MS) return null
  return draft
}

export function descartarAvanceDraft(solicitudId: string) {
  borrarBorrador(claveBorrador(solicitudId))
  borrarBorrador(claveIdempotencia(solicitudId))
}

function claveIdempotencia(solicitudId: string) {
  return `srs:avance-draft:idempotencia:${solicitudId}`
}

/**
 * Devuelve una clave estable para el envío del avance de esta solicitud: la misma clave en cada
 * llamada mientras exista el borrador, para que un reintento tras perder la respuesta (señal
 * débil, timeout) no duplique el avance en el servidor. Se genera una vez y se persiste junto al
 * borrador; se descarta junto con él (ver `descartarAvanceDraft`) o al registrar el avance con
 * éxito (el caller debe llamar `borrarBorrador` sobre esta misma clave, vía `descartarAvanceDraft`).
 */
export function obtenerClaveIdempotencia(solicitudId: string): string {
  const existente = leerBorrador<string>(claveIdempotencia(solicitudId))
  if (existente) return existente
  const nueva = crypto.randomUUID()
  escribirBorrador(claveIdempotencia(solicitudId), nueva)
  return nueva
}

export function marcarSolicitudAbierta(solicitudId: string | null) {
  if (solicitudId) escribirBorrador(CLAVE_ULTIMA_ABIERTA, solicitudId)
  else borrarBorrador(CLAVE_ULTIMA_ABIERTA)
}

export function leerSolicitudAbierta(): string | null {
  return leerBorrador<string>(CLAVE_ULTIMA_ABIERTA)
}

/**
 * Guarda automáticamente los campos del formulario de avance mientras el operario escribe,
 * para no perder el trabajo si cierra la pestaña o pierde la señal. Debounce corto en cada
 * cambio, más un guardado inmediato al ocultarse la pestaña o antes de descargarla.
 */
export function useGuardarAvanceDraft(solicitudId: string, datos: AvanceDraftCampos) {
  const datosRef = useRef(datos)
  datosRef.current = datos
  const serializado = JSON.stringify(datos)

  useEffect(() => {
    function guardarAhora() {
      escribirBorrador(claveBorrador(solicitudId), {
        version: VERSION,
        guardadoEn: new Date().toISOString(),
        ...datosRef.current,
      })
    }
    const temporizador = setTimeout(guardarAhora, 500)
    document.addEventListener('visibilitychange', guardarAhora)
    window.addEventListener('pagehide', guardarAhora)
    return () => {
      clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', guardarAhora)
      window.removeEventListener('pagehide', guardarAhora)
    }
  }, [solicitudId, serializado])
}
