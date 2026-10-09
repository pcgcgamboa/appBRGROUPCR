import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Truck } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { GridPagination } from '@/components/molecules/grid-pagination'
import type {
  EstadoRutaProceso,
  RutaProceso,
  SolicitudProgramada,
} from '@/features/flota/types/flota.types'
import { cn } from '@/lib/utils'

const TAMANO_PAGINA_RESUMEN = 4

const semana = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const estilos: Record<
  EstadoRutaProceso,
  { label: string; color: string; badge: 'primary' | 'warning' | 'success' | 'destructive' }
> = {
  planificada: { label: 'Planificada', color: 'bg-primary', badge: 'primary' },
  en_curso: { label: 'En curso', color: 'bg-warning', badge: 'warning' },
  finalizada: { label: 'Finalizada', color: 'bg-success', badge: 'success' },
  cancelada: { label: 'Cancelada', color: 'bg-destructive', badge: 'destructive' },
}
// Exportadas (sin cambiar su lógica) para poder probarlas directo en
// route-planning-calendar.test.ts, sin montar el componente completo.
export function fechaId(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}
export function inicioDeSemana(fecha: Date) {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7))
  return inicio
}
export function diasDelMes(fecha: Date) {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const inicio = inicioDeSemana(primero)
  return Array.from(
    { length: 42 },
    (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i),
  )
}
export function RoutePlanningCalendar({
  rutas,
  solicitudes,
  onEdit,
  onScheduleRequest,
  filtros,
}: {
  rutas: RutaProceso[]
  solicitudes: SolicitudProgramada[]
  onEdit: (ruta: RutaProceso) => void
  onScheduleRequest: (fecha: string) => void
  filtros?: ReactNode
}) {
  const hoy = useMemo(() => new Date(), [])
  const [semanaInicio, setSemanaInicio] = useState(() => inicioDeSemana(hoy))
  const [vista, setVista] = useState<'semana' | 'mes'>('semana')
  const [diaActivo, setDiaActivo] = useState<string | null>(null)
  const [paginaResumen, setPaginaResumen] = useState(1)
  const dias = useMemo(() => {
    if (vista === 'mes') return diasDelMes(semanaInicio)
    return Array.from(
      { length: 7 },
      (_, i) =>
        new Date(semanaInicio.getFullYear(), semanaInicio.getMonth(), semanaInicio.getDate() + i),
    )
  }, [semanaInicio, vista])
  const porDia = useMemo(
    () =>
      rutas.reduce((mapa, ruta) => {
        mapa.set(ruta.fecha_programada, [...(mapa.get(ruta.fecha_programada) ?? []), ruta])
        return mapa
      }, new Map<string, RutaProceso[]>()),
    [rutas],
  )
  function moverPeriodo(delta: number) {
    const nueva = new Date(semanaInicio)
    if (vista === 'semana') nueva.setDate(nueva.getDate() + delta * 7)
    else nueva.setMonth(nueva.getMonth() + delta)
    setSemanaInicio(vista === 'semana' ? nueva : new Date(nueva.getFullYear(), nueva.getMonth(), 1))
    setDiaActivo(null)
  }
  function irHoy() {
    setSemanaInicio(inicioDeSemana(hoy))
    setDiaActivo(fechaId(hoy))
  }
  // El rango del resumen sigue el mismo filtro Semana/Mes del calendario: en vista Mes cubre el
  // mes completo (1 al último día), no solo los 7 días de la semana de `semanaInicio`.
  const inicioResumen =
    vista === 'mes'
      ? new Date(semanaInicio.getFullYear(), semanaInicio.getMonth(), 1)
      : inicioDeSemana(semanaInicio)
  const finResumen =
    vista === 'mes'
      ? new Date(semanaInicio.getFullYear(), semanaInicio.getMonth() + 1, 0)
      : (() => {
          const fin = new Date(inicioResumen)
          fin.setDate(fin.getDate() + 6)
          return fin
        })()
  const inicioId = fechaId(inicioResumen)
  const finId = fechaId(finResumen)
  const rutasResumen = diaActivo
    ? (porDia.get(diaActivo) ?? [])
    : rutas.filter((ruta) => ruta.fecha_programada >= inicioId && ruta.fecha_programada <= finId)
  const semanaFin = dias[6]
  const etiquetaSemana = `${semanaInicio.toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'short',
  })} – ${semanaFin.toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`
  const etiquetaPeriodo =
    vista === 'semana'
      ? `Semana del ${etiquetaSemana}`
      : semanaInicio.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })
  const solicitudesResumen = solicitudes.filter((item) =>
    diaActivo
      ? item.fecha_programada === diaActivo
      : item.fecha_programada >= inicioId && item.fecha_programada <= finId,
  )
  // Rutas y solicitudes del resumen se paginan juntas (4 por página) para que el panel no crezca
  // sin límite cuando el período tiene mucho trabajo planificado.
  const itemsResumen: (
    { tipo: 'ruta'; ruta: RutaProceso } | { tipo: 'solicitud'; solicitud: SolicitudProgramada }
  )[] = [
    ...rutasResumen.map((ruta) => ({ tipo: 'ruta' as const, ruta })),
    ...solicitudesResumen.map((solicitud) => ({ tipo: 'solicitud' as const, solicitud })),
  ]
  const paginaActual = Math.min(
    paginaResumen,
    Math.max(1, Math.ceil(itemsResumen.length / TAMANO_PAGINA_RESUMEN)),
  )
  const itemsPagina = itemsResumen.slice(
    (paginaActual - 1) * TAMANO_PAGINA_RESUMEN,
    paginaActual * TAMANO_PAGINA_RESUMEN,
  )
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-xl border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="capitalize font-bold">{etiquetaPeriodo}</h3>
          <div className="flex flex-wrap items-center gap-3">
            {filtros}
            <div className="flex gap-1">
              <Button
                variant={vista === 'semana' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setVista('semana')
                  setDiaActivo(null)
                }}
              >
                Semana
              </Button>
              <Button
                variant={vista === 'mes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setVista('mes')
                  setDiaActivo(null)
                }}
              >
                Mes
              </Button>
              <Button variant="outline" size="sm" onClick={irHoy}>
                Hoy
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Periodo anterior"
                onClick={() => moverPeriodo(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Periodo siguiente"
                onClick={() => moverPeriodo(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </header>
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {semana.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[10px] font-semibold text-muted-foreground sm:text-xs"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const id = fechaId(dia)
            const eventos = porDia.get(id) ?? []
            return (
              <div
                key={id}
                className={cn(
                  'relative',
                  vista === 'semana'
                    ? 'min-h-28 border-b border-r p-2 text-left hover:bg-accent sm:min-h-44'
                    : 'min-h-20 border-b border-r p-1 text-left hover:bg-accent sm:min-h-28 sm:p-2',
                  id === diaActivo && 'bg-primary-soft/60 ring-2 ring-inset ring-primary/40',
                )}
              >
                <button
                  type="button"
                  onClick={() => setDiaActivo((actual) => (actual === id ? null : id))}
                  aria-label={dia.toLocaleDateString('es-CR') + ', ' + eventos.length + ' rutas'}
                  className={cn(
                    'grid size-6 place-items-center rounded-full text-xs font-semibold',
                    id === fechaId(hoy) && 'bg-primary text-primary-foreground',
                  )}
                >
                  {dia.getDate()}
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1 grid size-7 place-items-center rounded-md border bg-background text-lg font-medium text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
                  aria-label={`Agregar solicitud el ${dia.toLocaleDateString('es-CR')}`}
                  onClick={() => {
                    setDiaActivo(id)
                    onScheduleRequest(id)
                  }}
                >
                  +
                </button>
                <span className="mt-1 flex gap-0.5 sm:block sm:space-y-1">
                  {eventos.slice(0, 3).map((ruta) => (
                    <span key={ruta.id} className="block">
                      <span
                        className={cn(
                          'block size-1.5 rounded-full sm:hidden',
                          estilos[ruta.estado].color,
                        )}
                      />
                      <span className="hidden truncate rounded bg-background px-1 py-0.5 text-[10px] shadow-sm sm:block">
                        {ruta.codigo} - {ruta.nombre}
                      </span>
                    </span>
                  ))}
                  {eventos.length > 3 && (
                    <span className="hidden text-[10px] text-primary sm:block">
                      +{eventos.length - 3} mas
                    </span>
                  )}
                  {solicitudes
                    .filter((item) => item.fecha_programada === id)
                    .slice(0, 2)
                    .map((item) => (
                      <span
                        key={item.solicitud_id}
                        className="hidden truncate rounded bg-primary-soft px-1 py-0.5 text-[10px] text-primary-soft-foreground sm:block"
                      >
                        #{item.solicitud?.numero} · {item.solicitud?.estado.replace(/_/g, ' ')}
                      </span>
                    ))}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <aside className="space-y-3" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {diaActivo
                ? 'Día seleccionado'
                : vista === 'semana'
                  ? 'Resumen semanal'
                  : 'Resumen mensual'}
            </p>
            <h3 className="capitalize font-bold">
              {diaActivo
                ? new Intl.DateTimeFormat('es-CR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }).format(new Date(diaActivo + 'T00:00:00'))
                : vista === 'semana'
                  ? etiquetaSemana
                  : semanaInicio.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          {diaActivo && (
            <Button variant="outline" size="sm" onClick={() => setDiaActivo(null)}>
              {vista === 'semana' ? 'Ver semana' : 'Ver mes'}
            </Button>
          )}
        </div>
        {itemsPagina.map((item) =>
          item.tipo === 'ruta' ? (
            <button
              key={item.ruta.id}
              type="button"
              onClick={() => onEdit(item.ruta)}
              className="w-full rounded-lg border bg-card p-3 text-left shadow-sm hover:border-primary/40 hover:bg-accent"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary">{item.ruta.codigo}</p>
                  <p className="truncate font-semibold">{item.ruta.nombre}</p>
                </div>
                <Badge variant={estilos[item.ruta.estado].badge}>
                  {estilos[item.ruta.estado].label}
                </Badge>
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {item.ruta.responsable?.nombre_completo ?? 'Sin responsable'}
              </p>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex gap-1">
                  <MapPin className="size-3.5" />
                  {item.ruta.ruta_solicitudes.length} solicitudes
                </span>
                <span className="flex gap-1">
                  <Truck className="size-3.5" />
                  {item.ruta.ruta_vehiculos.length} vehiculos
                </span>
              </div>
            </button>
          ) : (
            (() => {
              const ruta = item.solicitud.ruta_solicitudes[0]?.ruta
              return (
                <div key={item.solicitud.solicitud_id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-primary">
                        Solicitud #{item.solicitud.solicitud?.numero}
                      </p>
                      <p className="text-sm font-semibold">{item.solicitud.solicitud?.nombre}</p>
                    </div>
                    <Badge variant={ruta ? 'success' : 'warning'}>
                      {ruta ? `En ruta ${ruta.codigo}` : 'Pendiente de ruta'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs capitalize text-muted-foreground">
                    Estado: {item.solicitud.solicitud?.estado.replace(/_/g, ' ')}
                  </p>
                </div>
              )
            })()
          ),
        )}
        {!itemsResumen.length && (
          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
            <CalendarDays className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No hay trabajo planificado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Planifique una ruta para esta fecha.
            </p>
          </div>
        )}
        {itemsResumen.length > TAMANO_PAGINA_RESUMEN && (
          <div className="overflow-hidden rounded-lg border">
            <GridPagination
              page={paginaActual}
              total={itemsResumen.length}
              pageSize={TAMANO_PAGINA_RESUMEN}
              onPageChange={setPaginaResumen}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(estilos).map(([key, valor]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={cn('size-2 rounded-full', valor.color)} />
              {valor.label}
            </span>
          ))}
        </div>
      </aside>
    </div>
  )
}
