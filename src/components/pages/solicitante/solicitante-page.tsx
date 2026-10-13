import {
  ChevronDown,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/atoms/dialog'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Skeleton } from '@/components/atoms/skeleton'
import { PageHeader } from '@/components/molecules/page-header'
import { ClientRequestDetail } from '@/components/organisms/client-request-detail'
import { ClientValidationForm } from '@/components/organisms/client-validation-form'
import { RequestCommunications } from '@/components/organisms/request-communications'
import { ClientWarrantyForm } from '@/components/organisms/client-warranty-form'
import { SolicitudForm } from '@/components/organisms/solicitud-form'
import { toast } from 'sonner'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useUrlFirmadaReporteCliente } from '@/features/cliente/hooks/use-cliente'
import { useEnviarSolicitud } from '@/features/solicitudes/hooks/use-borrador-solicitud'
import {
  useMisSolicitudes,
  useSolicitudesPortalCliente,
} from '@/features/solicitudes/hooks/use-mis-solicitudes'
import {
  descripcionEquipo,
  etiquetaEstado,
  garantiaEnCurso,
  garantiaVigente,
  pendienteDeEvaluar,
  puedeAplicarGarantia,
  rutaReporte,
} from '@/features/solicitudes/lib/portal-cliente'
import type {
  MiSolicitud,
  SolicitudPortalCliente,
} from '@/features/solicitudes/types/solicitudes.types'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'
import { normalizarError } from '@/lib/errores'

// Fuera del componente: referencia estable entre renders — evita que useOrdenamiento reconstruya
// su lógica interna en cada tecla/clic (ver el mismo arreglo en bandeja-encargado-page.tsx).
const accesoresOrdenamiento = {
  numero: (item: MiSolicitud) => item.numero,
  solicitud: (item: MiSolicitud) => item.nombre,
  tipo: (item: MiSolicitud) => item.tipo?.nombre ?? null,
  estado: (item: MiSolicitud) => item.estado,
  prioridad: (item: MiSolicitud) => item.prioridad,
}

const COLUMNAS = [
  ['numero', 'Número'],
  ['solicitud', 'Solicitud'],
  ['tipo', 'Tipo'],
  ['estado', 'Estado'],
  ['prioridad', 'Prioridad'],
] as const
// La prioridad la define el proveedor para organizar su trabajo; el Cliente no la ve.
const COLUMNAS_CLIENTE = COLUMNAS.filter(([columna]) => columna !== 'prioridad')

const SIN_EQUIPO = '__sin_equipo__'
const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' })

/** En el portal del Cliente las filas traen además evaluación, garantía, ubicación y equipo. */
function comoPortal(item: MiSolicitud) {
  return 'garantia_vence_en' in item ? (item as SolicitudPortalCliente) : null
}

export function SolicitantePage({
  usuarioId,
  clienteId,
  modoCliente = false,
}: {
  usuarioId: string
  clienteId: string | null
  /** Portal del Cliente: todas las solicitudes de su organización, con detalle, evaluación y garantía. */
  modoCliente?: boolean
}) {
  const propias = useMisSolicitudes(usuarioId, !modoCliente)
  const deOrganizacion = useSolicitudesPortalCliente(clienteId, modoCliente)
  const solicitudes = modoCliente ? deOrganizacion : propias
  const urlReporte = useUrlFirmadaReporteCliente()
  const [creando, setCreando] = useState(false)
  const enviarSolicitud = useEnviarSolicitud()
  const [garantiaDe, setGarantiaDe] = useState<SolicitudPortalCliente | null>(null)
  // Un solo panel abierto en toda la tabla: el detalle (o la edición del borrador) o los mensajes
  // de UNA solicitud. Abrir cualquiera de los dos en otra fila cierra el que estaba abierto.
  const [panel, setPanel] = useState<{ id: string; modo: 'detalle' | 'mensajes' } | null>(null)
  function alternarPanel(id: string, modo: 'detalle' | 'mensajes') {
    setPanel((actual) => (actual?.id === id && actual.modo === modo ? null : { id, modo }))
  }
  const [evaluando, setEvaluando] = useState<SolicitudPortalCliente | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todos')
  const [ubicacion, setUbicacion] = useState('todas')
  const [equipo, setEquipo] = useState('todos')

  const portal = useMemo(() => deOrganizacion.data ?? [], [deOrganizacion.data])
  const opcionesUbicacion = useMemo(
    () =>
      Array.from(
        new Map(
          portal
            .filter((item) => item.ubicacion_id && item.ubicacion)
            .map((item) => [item.ubicacion_id as string, item.ubicacion?.nombre ?? '']),
        ),
      ).sort((a, b) => a[1].localeCompare(b[1], 'es')),
    [portal],
  )
  const opcionesEquipo = useMemo(
    () =>
      Array.from(
        new Map(
          portal
            .filter((item) => item.equipo_id && item.equipo)
            .map((item) => [item.equipo_id as string, descripcionEquipo(item.equipo) ?? '']),
        ),
      ).sort((a, b) => a[1].localeCompare(b[1], 'es')),
    [portal],
  )
  const opcionesEstado = useMemo(
    () => Array.from(new Set((solicitudes.data ?? []).map((item) => item.estado))).sort(),
    [solicitudes.data],
  )

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es')
    const base: MiSolicitud[] = solicitudes.data ?? []
    return base.filter((item) => {
      const fila = comoPortal(item)
      if (estado !== 'todos' && item.estado !== estado) return false
      if (ubicacion !== 'todas' && fila?.ubicacion_id !== ubicacion) return false
      if (equipo === SIN_EQUIPO && fila?.equipo_id) return false
      if (equipo !== 'todos' && equipo !== SIN_EQUIPO && fila?.equipo_id !== equipo) return false
      if (!termino) return true
      return [item.numero, item.nombre, item.tipo?.nombre, fila?.detalle]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')
        .includes(termino)
    })
  }, [solicitudes.data, busqueda, estado, ubicacion, equipo])

  const {
    datosOrdenados: solicitudesOrdenadas,
    columnaActiva,
    direccion,
    ordenarPor,
  } = useOrdenamiento(filtradas, accesoresOrdenamiento)
  const porEvaluar = modoCliente ? portal.filter(pendienteDeEvaluar).length : 0
  const columnas = modoCliente ? COLUMNAS_CLIENTE : COLUMNAS
  const totalColumnas = columnas.length + 1
  const hayFiltros =
    Boolean(busqueda.trim()) || estado !== 'todos' || ubicacion !== 'todas' || equipo !== 'todos'

  if (!clienteId)
    return (
      <p
        role="alert"
        className="rounded-md bg-warning-soft p-4 text-sm text-warning-soft-foreground"
      >
        Su usuario necesita estar asociado a un cliente antes de crear solicitudes.
      </p>
    )

  function aplicarGarantia(fila: SolicitudPortalCliente) {
    setGarantiaDe(fila)
  }

  function evaluar(fila: SolicitudPortalCliente) {
    setEvaluando(fila)
  }

  async function enviarAlProveedor(solicitud: MiSolicitud) {
    await enviarSolicitud.mutateAsync(solicitud.id)
    toast.success(`Solicitud #${solicitud.numero} enviada al proveedor.`)
  }

  async function verReporte(rutaStorage: string) {
    // Abre la pestaña dentro del gesto del clic y la redirige después de resolver la URL firmada
    // — esperar el async primero perdería el gesto de usuario y el navegador bloquearía el popup.
    const ventana = window.open('', '_blank')
    const url = await urlReporte.mutateAsync(rutaStorage)
    if (ventana) ventana.location.href = url
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Mis solicitudes"
          description={
            modoCliente
              ? 'Consulte el detalle y estado de sus solicitudes, evalúe los servicios cerrados o aplique la garantía.'
              : 'Cree una solicitud y consulte su estado de atención.'
          }
        />
        <Button onClick={() => setCreando((actual) => !actual)}>
          {creando ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
          {creando ? 'Cerrar formulario' : 'Nueva solicitud'}
        </Button>
      </div>
      {porEvaluar > 0 && (
        <p className="flex items-center gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-soft-foreground">
          <Star className="size-4 shrink-0" />
          {porEvaluar === 1
            ? 'Tiene 1 servicio cerrado pendiente de evaluar. Use la acción "Evaluar" en la tabla.'
            : `Tiene ${porEvaluar} servicios cerrados pendientes de evaluar. Use la acción "Evaluar" en la tabla.`}
        </p>
      )}
      {creando && (
        <SolicitudForm
          usuarioId={usuarioId}
          clienteId={clienteId}
          onCreated={() => setCreando(false)}
          onClose={() => setCreando(false)}
        />
      )}
      {enviarSolicitud.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(enviarSolicitud.error).mensaje}
        </p>
      )}
      {(solicitudes.error || urlReporte.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(solicitudes.error ?? urlReporte.error).mensaje}
        </p>
      )}
      <Dialog
        open={Boolean(garantiaDe)}
        onOpenChange={(abierto) => !abierto && setGarantiaDe(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Aplicar garantía</DialogTitle>
          <DialogDescription>
            Se creará un borrador enlazado al trabajo ya realizado; podrá revisarlo antes de
            enviarlo.
          </DialogDescription>
          {garantiaDe && (
            <ClientWarrantyForm
              solicitud={garantiaDe}
              onCancel={() => setGarantiaDe(null)}
              onAplicada={(borrador) => {
                setGarantiaDe(null)
                // Abre el borrador en modo Modificar para revisarlo y enviarlo.
                setPanel({ id: borrador.id, modo: 'detalle' })
                toast.success(
                  `Borrador de garantía #${borrador.numero} creado. Revíselo y pulse Enviar.`,
                )
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(evaluando)} onOpenChange={(abierto) => !abierto && setEvaluando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Evaluar servicio</DialogTitle>
          <DialogDescription>
            Evaluación corta y opcional sobre la atención recibida.
          </DialogDescription>
          {evaluando && (
            <ClientValidationForm solicitud={evaluando} onSaved={() => setEvaluando(null)} />
          )}
        </DialogContent>
      </Dialog>
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          aria-label="Buscar solicitudes"
          placeholder="Buscar por número, nombre o detalle…"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
        <Select
          aria-label="Filtrar por estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
        >
          <option value="todos">Todos los estados</option>
          {opcionesEstado.map((item) => (
            <option key={item} value={item}>
              {etiquetaEstado(item)}
            </option>
          ))}
        </Select>
        {modoCliente && (
          <>
            <Select
              aria-label="Filtrar por ubicación"
              value={ubicacion}
              onChange={(event) => setUbicacion(event.target.value)}
            >
              <option value="todas">Todas las ubicaciones</option>
              {opcionesUbicacion.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por equipo"
              value={equipo}
              onChange={(event) => setEquipo(event.target.value)}
            >
              <option value="todos">Todos los equipos</option>
              <option value={SIN_EQUIPO}>Sin equipo asociado</option>
              {opcionesEquipo.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </Select>
          </>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              {columnas.map(([columna, etiqueta]) => (
                <ThOrdenable
                  key={columna}
                  columna={columna}
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                  className="px-4 py-3"
                >
                  {etiqueta}
                </ThOrdenable>
              ))}
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index} className="border-t">
                  {Array.from({ length: totalColumnas }).map((__, cell) => (
                    <td key={cell} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : solicitudesOrdenadas.length ? (
              solicitudesOrdenadas.map((solicitud) => {
                const fila = comoPortal(solicitud)
                const reporte = fila ? rutaReporte(fila) : undefined
                const expandida = panel?.id === solicitud.id && panel.modo === 'detalle'
                const mensajesAbiertos = panel?.id === solicitud.id && panel.modo === 'mensajes'
                const esBorrador = solicitud.estado === 'creada'
                const panelId = `detalle-solicitud-${solicitud.id}`
                return (
                  <Fragment key={solicitud.id}>
                    <tr
                      className={
                        expandida || mensajesAbiertos
                          ? 'border-t bg-accent/40'
                          : 'border-t transition-colors hover:bg-accent/50'
                      }
                    >
                      <td className="px-4 py-3">#{solicitud.numero}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{solicitud.nombre}</span>
                        {fila?.original && (
                          <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <ShieldCheck className="size-3" />
                            Garantía de #{fila.original.numero}
                          </span>
                        )}
                        {fila && (fila.ubicacion || fila.equipo) && (
                          <span className="block text-xs text-muted-foreground">
                            {[fila.ubicacion?.nombre, descripcionEquipo(fila.equipo)]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{solicitud.tipo?.nombre}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge>{etiquetaEstado(solicitud.estado)}</Badge>
                          {solicitud.estado === 'creada' && (
                            <span className="text-xs text-muted-foreground">
                              El proveedor aún no la recibe
                            </span>
                          )}
                          {fila?.validacion && (
                            <span className="text-xs text-muted-foreground">
                              Evaluada:{' '}
                              {fila.validacion.satisfecho ? 'satisfecho' : 'no satisfecho'}
                              {fila.validacion.calificacion
                                ? ` · ${fila.validacion.calificacion}/5`
                                : ''}
                            </span>
                          )}
                          {fila?.estado === 'cerrada' && fila.garantia_vence_en && (
                            <span className="text-xs text-muted-foreground">
                              Garantía {garantiaVigente(fila) ? 'hasta' : 'vencida el'}{' '}
                              {fecha.format(new Date(fila.garantia_vence_en))}
                            </span>
                          )}
                          {fila && garantiaEnCurso(fila) && (
                            <span className="text-xs font-medium text-primary">
                              Garantía en curso: #{garantiaEnCurso(fila)?.numero}
                            </span>
                          )}
                        </div>
                      </td>
                      {!modoCliente && (
                        <td className="px-4 py-3">{solicitud.prioridad ?? 'Pendiente'}</td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {esBorrador && (
                            <Button
                              variant="destructive"
                              className="h-9"
                              disabled={enviarSolicitud.isPending}
                              onClick={() => void enviarAlProveedor(solicitud)}
                            >
                              <Send className="mr-2 size-4" />
                              Enviar
                            </Button>
                          )}
                          {/* Una sola acción: el borrador se modifica, el resto se consulta; ambos
                              abren el mismo formulario debajo de la fila. */}
                          <Button
                            variant="outline"
                            className="h-9"
                            aria-expanded={expandida}
                            aria-controls={panelId}
                            onClick={() => alternarPanel(solicitud.id, 'detalle')}
                          >
                            {esBorrador ? (
                              <Pencil className="mr-2 size-4" />
                            ) : (
                              <ChevronDown
                                className={
                                  expandida
                                    ? 'mr-2 size-4 rotate-180 transition-transform'
                                    : 'mr-2 size-4 transition-transform'
                                }
                              />
                            )}
                            {esBorrador
                              ? expandida
                                ? 'Cerrar edición'
                                : 'Modificar'
                              : expandida
                                ? 'Ocultar detalle'
                                : 'Ver detalle'}
                          </Button>
                          {fila && pendienteDeEvaluar(fila) && (
                            <Button className="h-9" onClick={() => evaluar(fila)}>
                              <Star className="mr-2 size-4" />
                              Evaluar
                            </Button>
                          )}
                          {fila && puedeAplicarGarantia(fila) && (
                            <Button
                              variant="outline"
                              className="h-9"
                              onClick={() => aplicarGarantia(fila)}
                            >
                              <ShieldCheck className="mr-2 size-4" />
                              Aplicar garantía
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="h-9"
                            aria-expanded={mensajesAbiertos}
                            aria-controls={panelId}
                            onClick={() => alternarPanel(solicitud.id, 'mensajes')}
                          >
                            <MessageSquare className="mr-2 size-4" />
                            {mensajesAbiertos ? 'Cerrar mensajes' : 'Mensajes'}
                          </Button>
                          {reporte && (
                            <Button
                              variant="outline"
                              className="h-9"
                              disabled={urlReporte.isPending}
                              onClick={() => void verReporte(reporte)}
                            >
                              <FileText className="mr-2 size-4" />
                              Reporte
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandida && (
                      <tr id={panelId} className="bg-muted/30">
                        <td colSpan={totalColumnas} className="space-y-4 px-4 pb-5 pt-2">
                          <SolicitudForm
                            key={solicitud.id}
                            usuarioId={usuarioId}
                            clienteId={clienteId}
                            borrador={solicitud}
                            soloLectura={!esBorrador}
                            onCreated={() => setPanel(null)}
                            onClose={() => setPanel(null)}
                          />
                          {fila && !esBorrador && (
                            <ClientRequestDetail
                              solicitud={fila}
                              onEvaluar={() => evaluar(fila)}
                              onAplicarGarantia={() => aplicarGarantia(fila)}
                              onVerReporte={(ruta) => void verReporte(ruta)}
                            />
                          )}
                        </td>
                      </tr>
                    )}
                    {mensajesAbiertos && (
                      <tr id={panelId} className="bg-muted/30">
                        <td colSpan={totalColumnas} className="px-4 pb-5 pt-2">
                          <RequestCommunications
                            solicitudId={solicitud.id}
                            modo="cliente"
                            onClose={() => setPanel(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            ) : (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-8 text-center text-muted-foreground">
                  {hayFiltros
                    ? 'No hay solicitudes para los filtros seleccionados.'
                    : 'No hay solicitudes registradas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
