import {
  CalendarDays,
  CalendarRange,
  ClipboardPlus,
  LayoutList,
  MapPinned,
  Plus,
  Settings2,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Skeleton } from '@/components/atoms/skeleton'
import { GridPagination } from '@/components/molecules/grid-pagination'
import { PageHeader } from '@/components/molecules/page-header'
import { WorkspacePanel } from '@/components/molecules/workspace-panel'
import { ProcessRouteForm } from '@/components/organisms/process-route-form'
import { RouteExpenses } from '@/components/organisms/route-expenses'
import { RoutePlanningCalendar } from '@/components/organisms/route-planning-calendar'
import { RouteTimeline } from '@/components/organisms/route-timeline'
import { VehicleMovementForm } from '@/components/organisms/vehicle-movement-form'
import {
  useProgramarSolicitud,
  useRutasProceso,
  useSolicitudesProgramadas,
} from '@/features/flota/hooks/use-flota'
import type { RutaProceso } from '@/features/flota/types/flota.types'
import { useSolicitudesParaRuta } from '@/features/rutas/hooks/use-control-rutas'
import { useOperadores } from '@/features/solicitudes/hooks/use-operadores'
import { normalizarError } from '@/lib/errores'

const statusOrder: Record<string, number> = {
  en_curso: 0,
  planificada: 1,
  finalizada: 2,
  cancelada: 3,
}

export function ProgramacionPage() {
  const rutas = useRutasProceso()
  const solicitudes = useSolicitudesProgramadas()
  const solicitudesDisponibles = useSolicitudesParaRuta()
  const operadores = useOperadores()
  const programar = useProgramarSolicitud()
  const panelRef = useRef<HTMLDivElement>(null)
  // "Programar" en la bandeja → "Crear ruta nueva" llega con ?nuevaRuta=<solicitud>&operador=…
  // y abre el formulario con esa solicitud ya incluida.
  const [searchParams, setSearchParams] = useSearchParams()
  const [solicitudInicial] = useState(() => {
    const id = searchParams.get('nuevaRuta')
    return id ? { id, operadorId: searchParams.get('operador') } : undefined
  })

  const [vista, setVista] = useState<'calendario' | 'listado'>('calendario')
  const [editando, setEditando] = useState<RutaProceso | null | undefined>(
    solicitudInicial ? null : undefined,
  )
  const [fechaInicial, setFechaInicial] = useState<string | undefined>(
    () => searchParams.get('fecha') ?? undefined,
  )
  const [conSolicitudInicial, setConSolicitudInicial] = useState(Boolean(solicitudInicial))

  function cerrarFormulario() {
    setEditando(undefined)
    if (conSolicitudInicial) {
      setConSolicitudInicial(false)
      setSearchParams({}, { replace: true })
    }
  }
  const [estado, setEstado] = useState('activas')
  const [operadorFilter, setOperadorFilter] = useState('')
  const [solicitudId, setSolicitudId] = useState('')
  const [fechaSemana, setFechaSemana] = useState<string | null>(null)
  const [registroRuta, setRegistroRuta] = useState<RutaProceso | null>(null)
  const [trackingRuta, setTrackingRuta] = useState<RutaProceso | null>(null)
  const [gastosRuta, setGastosRuta] = useState<RutaProceso | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const rutasVisibles = useMemo(
    () =>
      (rutas.data ?? []).filter(
        (ruta) =>
          (estado === 'todas' ||
            (estado === 'activas'
              ? ['planificada', 'en_curso'].includes(ruta.estado)
              : ruta.estado === estado)) &&
          (!operadorFilter || ruta.responsable_id === operadorFilter),
      ),
    [rutas.data, estado, operadorFilter],
  )

  // Solicitudes sueltas (sin ruta) del calendario también respetan el filtro de operador, para que
  // "consultar las solicitudes asociadas a un técnico" cubra ambos casos: en ruta o aún sin ruta.
  const solicitudesVisibles = useMemo(
    () =>
      (solicitudes.data ?? []).filter(
        (item) => !operadorFilter || item.solicitud?.operador_id === operadorFilter,
      ),
    [solicitudes.data, operadorFilter],
  )

  const filtradas = useMemo(
    () =>
      [...rutasVisibles]
        .filter((route) =>
          `${route.codigo} ${route.nombre} ${route.responsable?.nombre_completo ?? ''}`
            .toLocaleLowerCase('es')
            .includes(search.toLocaleLowerCase('es')),
        )
        .sort(
          (a, b) =>
            statusOrder[a.estado] - statusOrder[b.estado] ||
            b.fecha_programada.localeCompare(a.fecha_programada),
        ),
    [rutasVisibles, search],
  )
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtradas.length / pageSize)))
  const paginadas = filtradas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function abrirFormulario(ruta: RutaProceso | null, fecha?: string) {
    setConSolicitudInicial(false)
    setEditando(ruta)
    setFechaInicial(fecha)
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  function abrirGastos(ruta: RutaProceso) {
    setEditando(undefined)
    setGastosRuta(ruta)
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  return (
    <section className="space-y-6">
      <div ref={panelRef} className="flex flex-wrap items-start justify-between gap-3 scroll-mt-24">
        <PageHeader
          title="Programación"
          description="Visualice el calendario, programe solicitudes y administre las rutas del equipo."
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-md border bg-card p-1">
            <Button
              type="button"
              variant={vista === 'calendario' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVista('calendario')}
            >
              <CalendarRange className="mr-2 size-4" />
              Calendario
            </Button>
            <Button
              type="button"
              variant={vista === 'listado' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setVista('listado')}
            >
              <LayoutList className="mr-2 size-4" />
              Rutas
            </Button>
          </div>
          <Button onClick={() => abrirFormulario(null)}>
            <Plus className="size-4" />
            Planificar
          </Button>
        </div>
      </div>

      {editando !== undefined && (
        <WorkspacePanel
          variant="management"
          icon={Settings2}
          title={editando ? `Editar programación ${editando.codigo}` : 'Nueva programación'}
          description="Seleccione las solicitudes, el responsable, los participantes y los vehículos de la ruta."
          onClose={cerrarFormulario}
        >
          <ProcessRouteForm
            key={
              editando?.id ??
              `nueva-${fechaInicial ?? 'hoy'}-${conSolicitudInicial ? solicitudInicial?.id : ''}`
            }
            ruta={editando ?? undefined}
            fechaInicial={fechaInicial}
            solicitudInicial={conSolicitudInicial ? solicitudInicial : undefined}
            onClose={cerrarFormulario}
          />
        </WorkspacePanel>
      )}

      {gastosRuta && <RouteExpenses ruta={gastosRuta} onClose={() => setGastosRuta(null)} />}

      {rutas.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(rutas.error).mensaje}
        </p>
      )}

      {fechaSemana && (
        <WorkspacePanel
          variant="management"
          icon={CalendarDays}
          title="Asignar solicitud al día"
          description="La solicitud se mostrará únicamente en la fecha seleccionada."
          onClose={() => setFechaSemana(null)}
        >
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end"
            onSubmit={async (event) => {
              event.preventDefault()
              await programar.mutateAsync({ solicitudId, fecha: fechaSemana })
              setSolicitudId('')
              setFechaSemana(null)
            }}
          >
            <label className="grid gap-2 text-sm font-medium">
              Solicitud
              <Select
                required
                value={solicitudId}
                onChange={(event) => setSolicitudId(event.target.value)}
              >
                <option value="">Seleccione una solicitud…</option>
                {solicitudesDisponibles.data?.map((solicitud) => {
                  const programada = solicitudes.data?.find(
                    (item) => item.solicitud_id === solicitud.id,
                  )
                  return (
                    <option key={solicitud.id} value={solicitud.id}>
                      #{solicitud.numero} · {solicitud.nombre}
                      {programada ? ` · Día ${programada.fecha_programada}` : ''}
                    </option>
                  )
                })}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Día seleccionado
              <Input required type="date" value={fechaSemana} readOnly />
            </label>
            <Button type="submit" disabled={!solicitudId || programar.isPending}>
              {programar.isPending ? 'Programando…' : 'Asignar día'}
            </Button>
          </form>
          {programar.error && (
            <p role="alert" className="text-sm text-destructive">
              {normalizarError(programar.error).mensaje}
            </p>
          )}
        </WorkspacePanel>
      )}

      {vista === 'calendario' ? (
        rutas.isLoading || solicitudes.isLoading ? (
          <Skeleton className="h-80 w-full rounded-xl" />
        ) : (
          <RoutePlanningCalendar
            rutas={rutasVisibles}
            solicitudes={solicitudesVisibles}
            onEdit={(ruta) => abrirFormulario(ruta)}
            onScheduleRequest={(fecha) => setFechaSemana(fecha)}
            filtros={
              <>
                <Select
                  aria-label="Filtrar por estado"
                  className="h-9 w-auto"
                  value={estado}
                  onChange={(event) => setEstado(event.target.value)}
                >
                  <option value="activas">Trabajo activo</option>
                  <option value="todas">Todo</option>
                  <option value="planificada">Planificado</option>
                  <option value="en_curso">En curso</option>
                  <option value="finalizada">Finalizado</option>
                  <option value="cancelada">Cancelado</option>
                </Select>
                <Select
                  aria-label="Filtrar por operador"
                  className="h-9 w-auto"
                  value={operadorFilter}
                  onChange={(event) => setOperadorFilter(event.target.value)}
                >
                  <option value="">Todos los operadores</option>
                  {operadores.data?.map((operador) => (
                    <option key={operador.id} value={operador.id}>
                      {operador.nombre_completo}
                    </option>
                  ))}
                </Select>
              </>
            }
          />
        )
      ) : (
        <>
          <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[minmax(220px,1fr)_220px_220px]">
            <Input
              type="search"
              placeholder="Buscar por ruta o responsable…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <Select
              aria-label="Filtrar por estado"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value)
                setPage(1)
              }}
            >
              <option value="activas">Rutas activas</option>
              <option value="todas">Todas las rutas</option>
              <option value="planificada">Planificadas</option>
              <option value="en_curso">En curso</option>
              <option value="finalizada">Finalizadas</option>
              <option value="cancelada">Canceladas</option>
            </Select>
            <Select
              aria-label="Filtrar por operador"
              value={operadorFilter}
              onChange={(e) => {
                setOperadorFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos los operadores</option>
              {operadores.data?.map((operador) => (
                <option key={operador.id} value={operador.id}>
                  {operador.nombre_completo}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {rutas.isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-9 w-40" />
                  </div>
                ))
              : paginadas.map((r) => (
                  <article key={r.id} className="rounded-lg border bg-card p-5 shadow-sm">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {r.codigo} · {r.fecha_programada}
                          {r.fecha_fin && r.fecha_fin !== r.fecha_programada
                            ? ` al ${r.fecha_fin}`
                            : ''}
                        </p>
                        <h2 className="font-semibold">{r.nombre}</h2>
                      </div>
                      <Badge>{r.estado.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-3 text-sm">Responsable: {r.responsable?.nombre_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.ruta_solicitudes.length} solicitud(es) ·{' '}
                      {r.ruta_vehiculos.length
                        ? r.ruta_vehiculos.map((item) => item.vehiculo?.placa).join(', ')
                        : 'Sin vehículo asignado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.ruta_participantes.length} participante(s) · Viáticos: ₡
                      {r.ruta_participantes
                        .reduce((total, item) => total + Number(item.viatico), 0)
                        .toLocaleString('es-CR')}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => abrirFormulario(r)}>
                        <MapPinned className="mr-2 size-4" />
                        Editar ruta
                      </Button>
                      <Button variant="outline" onClick={() => setTrackingRuta(r)}>
                        Ver seguimiento
                      </Button>
                      <Button variant="outline" onClick={() => abrirGastos(r)}>
                        Gastos
                      </Button>
                      <Button
                        variant="outline"
                        disabled={r.estado === 'cancelada'}
                        onClick={() => setRegistroRuta(r)}
                      >
                        <ClipboardPlus className="mr-2 size-4" />
                        Registro del vehículo
                      </Button>
                    </div>
                  </article>
                ))}
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <GridPagination
              page={currentPage}
              total={filtradas.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </div>
          {!rutas.isLoading && !filtradas.length && (
            <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
              No hay rutas agrupadas.
            </p>
          )}
          {registroRuta && (
            <VehicleMovementForm ruta={registroRuta} onClose={() => setRegistroRuta(null)} />
          )}
          {trackingRuta && (
            <RouteTimeline ruta={trackingRuta} onClose={() => setTrackingRuta(null)} />
          )}
        </>
      )}
    </section>
  )
}
