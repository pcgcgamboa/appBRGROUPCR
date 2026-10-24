import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { OperatorRecommendation } from '@/components/organisms/operator-recommendation'
import {
  useGuardarRutaProceso,
  useProgramarSolicitud,
  useRutasProceso,
} from '@/features/flota/hooks/use-flota'
import type { RutaProceso } from '@/features/flota/types/flota.types'
import { useGestionarSolicitud } from '@/features/solicitudes/hooks/use-gestionar-solicitud'
import { useOperadores } from '@/features/solicitudes/hooks/use-operadores'
import { useSolicitudesAdmin } from '@/features/solicitudes/hooks/use-solicitudes-admin'
import type { SolicitudAdmin } from '@/features/solicitudes/types/solicitudes.types'
import { normalizarError } from '@/lib/errores'

// Atajo desde la bandeja: asigna/reasigna el operador responsable y fija su fecha de atención
// (la misma fecha programada que usa Programación → Calendario) sin tener que abrir el panel
// completo de "Gestionar". `gestionar_solicitud` (acción 'asignar') exige prioridad + operador
// juntos — ver supabase/functions/gestionar-solicitud/index.ts — así que ambos campos van en el
// mismo formulario, precargados con los valores actuales de la solicitud.
// También asocia la solicitud a una ruta: a una existente (se reenvía la ruta completa a
// guardar_ruta_proceso con la solicitud y su operador como participante, en una sola llamada
// atómica) o a una nueva, abriendo Programación con la solicitud ya incluida.

type ModoRuta = 'ninguna' | 'existente' | 'nueva'

/** Ruta existente + esta solicitud; el operador asignado se suma como participante (viático 0). */
function rutaConSolicitud(ruta: RutaProceso, solicitudId: string, operadorId: string) {
  const participantes = ruta.ruta_participantes.map((item) => ({
    usuario_id: item.usuario_id,
    viatico: item.viatico,
    detalle_viatico: item.detalle_viatico ?? '',
  }))
  if (!participantes.some((item) => item.usuario_id === operadorId)) {
    participantes.push({ usuario_id: operadorId, viatico: 0, detalle_viatico: '' })
  }
  return {
    id: ruta.id,
    codigo: ruta.codigo,
    nombre: ruta.nombre,
    descripcion: ruta.descripcion ?? '',
    fecha: ruta.fecha_programada,
    fecha_fin: ruta.fecha_fin,
    estado: ruta.estado,
    responsable_id: ruta.responsable_id,
    solicitudes: [
      ...[...ruta.ruta_solicitudes].sort((a, b) => a.orden - b.orden).map((x) => x.solicitud_id),
      solicitudId,
    ],
    // guardar_ruta_proceso marca como principal el primer vehículo: se conserva el actual.
    vehiculos: [...ruta.ruta_vehiculos]
      .sort((a, b) => Number(b.es_principal) - Number(a.es_principal))
      .map((x) => x.vehiculo_id),
    participantes,
  }
}

export function QuickScheduleDialog({
  solicitud,
  onClose,
}: {
  solicitud: SolicitudAdmin
  onClose: () => void
}) {
  const operadores = useOperadores()
  // Misma consulta (y caché) que la bandeja: carga y experiencia de cada operador.
  const { solicitudes } = useSolicitudesAdmin()
  const gestionar = useGestionarSolicitud()
  const programar = useProgramarSolicitud()
  const rutas = useRutasProceso()
  const guardarRuta = useGuardarRutaProceso()
  const navigate = useNavigate()
  const location = useLocation()
  const [operadorId, setOperadorId] = useState(solicitud.operador_id ?? '')
  const [prioridad, setPrioridad] = useState(solicitud.prioridad ?? 'media')
  const [fecha, setFecha] = useState('')
  const [modoRuta, setModoRuta] = useState<ModoRuta>('ninguna')
  const [rutaId, setRutaId] = useState('')

  // Una solicitud solo puede estar en una ruta (ruta_solicitudes.solicitud_id es único).
  const rutaActual = rutas.data?.find((ruta) =>
    ruta.ruta_solicitudes.some((item) => item.solicitud_id === solicitud.id),
  )
  const rutasActivas = (rutas.data ?? [])
    .filter((ruta) => ['planificada', 'en_curso'].includes(ruta.estado))
    .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))

  const error = gestionar.error ?? programar.error ?? guardarRuta.error
  const enviando = gestionar.isPending || programar.isPending || guardarRuta.isPending

  function elegirRuta(id: string) {
    setRutaId(id)
    // Sin fecha propia, la solicitud se atiende el día de la ruta.
    const ruta = rutasActivas.find((item) => item.id === id)
    if (ruta && !fecha) setFecha(ruta.fecha_programada)
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    await gestionar.mutateAsync({
      accion: 'asignar',
      solicitud_id: solicitud.id,
      operador_id: operadorId,
      prioridad,
    })
    if (fecha) await programar.mutateAsync({ solicitudId: solicitud.id, fecha })
    const ruta = rutasActivas.find((item) => item.id === rutaId)
    if (modoRuta === 'existente' && ruta) {
      await guardarRuta.mutateAsync(rutaConSolicitud(ruta, solicitud.id, operadorId))
      toast.success(`Solicitud #${solicitud.numero} asignada y agregada a la ruta ${ruta.codigo}.`)
    } else if (modoRuta === 'nueva') {
      const base = location.pathname.split('/')[1]
      const params = new URLSearchParams({ nuevaRuta: solicitud.id, operador: operadorId })
      if (fecha) params.set('fecha', fecha)
      toast.success(`Solicitud #${solicitud.numero} asignada. Complete la ruta nueva.`)
      navigate(`/${base}/programacion?${params.toString()}`)
    } else {
      toast.success(`Solicitud #${solicitud.numero} asignada.`)
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Operador, fecha y ruta</DialogTitle>
          <DialogDescription>
            Solicitud #{solicitud.numero} · {solicitud.nombre}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4">
          {solicitud.estado === 'enviada' && (
            <OperatorRecommendation
              solicitud={solicitud}
              solicitudes={solicitudes.data ?? []}
              operadores={operadores.data ?? []}
              operadorElegido={operadorId}
              onElegir={setOperadorId}
            />
          )}
          <label className="grid gap-2 text-sm font-medium">
            Operador responsable
            <Select required value={operadorId} onChange={(e) => setOperadorId(e.target.value)}>
              <option value="">Seleccione un operador…</option>
              {operadores.data?.map((operador) => (
                <option key={operador.id} value={operador.id}>
                  {operador.nombre_completo}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Prioridad
            <Select
              required
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as typeof prioridad)}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Fecha de atención (opcional)
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <span className="text-xs font-normal text-muted-foreground">
              Es la misma fecha programada que se ve en Programación → Calendario.
            </span>
          </label>
          <fieldset className="grid gap-2 text-sm">
            <legend className="mb-2 font-medium">Ruta</legend>
            {rutaActual ? (
              <p className="rounded-md bg-muted p-3 text-muted-foreground">
                Ya está en la ruta <strong>{rutaActual.codigo}</strong> (
                {rutaActual.fecha_programada}). Para cambiarla, edítela en Programación.
              </p>
            ) : (
              <>
                <Select
                  aria-label="Asociar a una ruta"
                  value={modoRuta}
                  onChange={(e) => setModoRuta(e.target.value as ModoRuta)}
                >
                  <option value="ninguna">Sin ruta por ahora</option>
                  <option value="existente" disabled={!rutasActivas.length}>
                    Agregar a una ruta existente
                    {rutasActivas.length ? '' : ' (no hay rutas activas)'}
                  </option>
                  <option value="nueva">Crear una ruta nueva con esta solicitud</option>
                </Select>
                {modoRuta === 'existente' && (
                  <Select
                    required
                    aria-label="Ruta existente"
                    value={rutaId}
                    onChange={(e) => elegirRuta(e.target.value)}
                  >
                    <option value="">Seleccione una ruta…</option>
                    {rutasActivas.map((ruta) => (
                      <option key={ruta.id} value={ruta.id}>
                        {ruta.codigo} · {ruta.fecha_programada} ·{' '}
                        {ruta.responsable?.nombre_completo ?? 'Sin responsable'}
                      </option>
                    ))}
                  </Select>
                )}
                <span className="text-xs text-muted-foreground">
                  {modoRuta === 'existente'
                    ? 'El operador se agrega a la ruta como participante; su viático se define al editarla.'
                    : modoRuta === 'nueva'
                      ? 'Al guardar se abre Programación con esta solicitud y su operador ya incluidos.'
                      : 'Puede asociarla después desde Programación.'}
                </span>
              </>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
            >
              {normalizarError(error).mensaje}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando || !operadorId || (modoRuta === 'existente' && !rutaId)}
            >
              {enviando ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
