import {
  CalendarClock,
  History,
  List,
  Lock,
  Mail,
  Map,
  MessageSquare,
  Package,
  Paperclip,
  Plus,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Select } from '@/components/atoms/select'
import { Input } from '@/components/atoms/input'
import { Textarea } from '@/components/atoms/textarea'
import { Skeleton } from '@/components/atoms/skeleton'
import { PageHeader } from '@/components/molecules/page-header'
import { GridPagination } from '@/components/molecules/grid-pagination'
import { WorkspacePanel } from '@/components/molecules/workspace-panel'
import { DisclosurePanel } from '@/components/molecules/disclosure-panel'
import { SolicitudForm } from '@/components/organisms/solicitud-form'
import { SolicitudesMap } from '@/components/organisms/solicitudes-map'
import { SlaBadge } from '@/components/molecules/sla-badge'
import { useGestionarSolicitud } from '@/features/solicitudes/hooks/use-gestionar-solicitud'
import { useOperadores } from '@/features/solicitudes/hooks/use-operadores'
import { useSolicitudesAdmin } from '@/features/solicitudes/hooks/use-solicitudes-admin'
import type {
  EstadoSolicitud,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'
import { useSession } from '@/features/auth/hooks/use-session'
import { RequestTechnicians } from '@/components/organisms/request-technicians'
import { RequestGeneralDataForm } from '@/components/organisms/request-general-data-form'
import { RequestMaterials } from '@/components/organisms/request-materials'
import { RequestTimeline } from '@/components/organisms/request-timeline'
import { RequestAttachments } from '@/components/organisms/request-attachments'
import { RequestCommunications } from '@/components/organisms/request-communications'
import { InternalRequestNotes } from '@/components/organisms/internal-request-notes'
import { RequestServiceFollowUp } from '@/components/organisms/request-service-follow-up'
import { QuickScheduleDialog } from '@/components/organisms/quick-schedule-dialog'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'
import { normalizarError } from '@/lib/errores'

function normalizarBusqueda(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

const transiciones: Partial<Record<EstadoSolicitud, EstadoSolicitud[]>> = {
  asignada: ['en_atencion', 'cancelada'],
  en_atencion: ['en_espera_materiales', 'atendida', 'cancelada'],
  en_espera_materiales: ['en_atencion', 'atendida', 'cancelada'],
  atendida: ['cerrada', 'en_atencion', 'cancelada'],
}

// El cierre ya no espera la validación del Cliente: este evalúa el servicio después del cierre.
function transicionesDisponibles(solicitud: SolicitudAdmin) {
  return transiciones[solicitud.estado] ?? []
}

const rango = { urgente: 0, alta: 1, media: 2, baja: 3 }

// Fuera del componente: referencia estable entre renders. Pasarle a useOrdenamiento un objeto de
// accesores nuevo en cada render (o datos recalculados sin memoizar) obliga a @tanstack/react-table
// a reconstruir toda su lógica interna en cada tecla del buscador o clic de encabezado — con listas
// grandes eso se sentía como el navegador colgado al ordenar.
const accesoresOrdenamiento = {
  numero: (item: SolicitudAdmin) => item.numero,
  solicitud: (item: SolicitudAdmin) => item.nombre,
  cliente: (item: SolicitudAdmin) => item.cliente?.nombre ?? null,
  prioridad: (item: SolicitudAdmin) => (item.prioridad ? rango[item.prioridad] : 4),
  estado: (item: SolicitudAdmin) => item.estado,
  sla: (item: SolicitudAdmin) => item.sla_vence_en,
}

export function BandejaEncargadoPage() {
  const { session } = useSession()
  const { solicitudes } = useSolicitudesAdmin()
  const operadores = useOperadores()
  const gestionar = useGestionarSolicitud()
  const [seleccionada, setSeleccionada] = useState<SolicitudAdmin | null>(null)
  const [trackingSeleccionada, setTrackingSeleccionada] = useState<SolicitudAdmin | null>(null)
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media')
  const [operadorId, setOperadorId] = useState('')
  const [estado, setEstado] = useState<EstadoSolicitud>('asignada')
  const [motivo, setMotivo] = useState('')
  const [comentarioPeticion, setComentarioPeticion] = useState('')
  const [creando, setCreando] = useState(false)
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('activas')
  const [operadorFilter, setOperadorFilter] = useState('')
  const [sortBy, setSortBy] = useState<'recientes' | 'prioridad'>('recientes')
  const [programando, setProgramando] = useState<SolicitudAdmin | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (seleccionada || trackingSeleccionada) {
      requestAnimationFrame(() =>
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }, [seleccionada, trackingSeleccionada])

  function abrir(item: SolicitudAdmin) {
    setTrackingSeleccionada(null)
    setSeleccionada(item)
    setPrioridad(item.prioridad ?? 'media')
    setOperadorId(item.operador_id ?? '')
    setEstado(transicionesDisponibles(item)[0] ?? item.estado)
    setMotivo('')
    setComentarioPeticion('')
  }

  async function ejecutar(input: Parameters<typeof gestionar.mutateAsync>[0]) {
    await gestionar.mutateAsync(input)
    setSeleccionada(null)
  }

  // A demanda, sin cerrar el panel: a diferencia de las demás acciones, no cambia el estado de la
  // solicitud, así que no tiene sentido descartar la vista tras enviarlo.
  async function notificarCliente(solicitudId: string) {
    try {
      await gestionar.mutateAsync({ accion: 'notificar_cliente', solicitud_id: solicitudId })
      toast.success('El correo al cliente quedó en proceso de envío.')
    } catch (error) {
      toast.error(normalizarError(error).mensaje)
    }
  }

  const ordenadas = useMemo(
    () =>
      [...(solicitudes.data ?? [])]
        .filter((item) => {
          const term = normalizarBusqueda(search)
          const matchesSearch = normalizarBusqueda(
            `${item.numero} ${item.nombre} ${item.cliente?.nombre ?? ''} ${item.tipo?.nombre ?? ''} ${item.operador?.nombre_completo ?? ''} ${item.solicitante?.nombre_completo ?? ''}`,
          ).includes(term)
          // Los borradores del Cliente ("creada") no le llegan al proveedor: solo se ven si se
          // filtra por ese estado explícitamente.
          const matchesStatus =
            statusFilter === 'creada'
              ? item.estado === 'creada'
              : item.estado !== 'creada' &&
                (statusFilter === 'todas' ||
                  (statusFilter === 'activas'
                    ? !['cerrada', 'cancelada', 'rechazada'].includes(item.estado)
                    : item.estado === statusFilter))
          const matchesOperador = !operadorFilter || item.operador_id === operadorFilter
          return matchesSearch && matchesStatus && matchesOperador
        })
        .sort((a, b) =>
          sortBy === 'prioridad'
            ? (a.prioridad ? rango[a.prioridad] : 4) - (b.prioridad ? rango[b.prioridad] : 4) ||
              b.creado_en.localeCompare(a.creado_en)
            : b.creado_en.localeCompare(a.creado_en),
        ),
    [solicitudes.data, search, statusFilter, operadorFilter, sortBy],
  )
  const {
    datosOrdenados: ordenadasPorColumna,
    columnaActiva,
    direccion,
    ordenarPor,
  } = useOrdenamiento(ordenadas, accesoresOrdenamiento)
  const currentPage = Math.min(page, Math.max(1, Math.ceil(ordenadas.length / pageSize)))
  const paginadas = ordenadasPorColumna.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const peticionPendiente = seleccionada?.peticiones.find(
    (peticion) => peticion.estado === 'pendiente',
  )
  const admiteReasignacion =
    seleccionada &&
    ['en_atencion', 'en_espera_materiales', 'atendida'].includes(seleccionada.estado)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Bandeja de solicitudes"
          description="Revise, priorice, asigne y controle el flujo de atención."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{ordenadas.length} solicitudes</Badge>
          <div
            className="flex rounded-lg border bg-card p-1 shadow-sm"
            aria-label="Vista de solicitudes"
          >
            <Button
              variant={vista === 'lista' ? 'default' : 'outline'}
              className={vista === 'lista' ? 'h-9' : 'h-9 border-0 shadow-none'}
              onClick={() => setVista('lista')}
            >
              <List className="mr-2 size-4" />
              Lista
            </Button>
            <Button
              variant={vista === 'mapa' ? 'default' : 'outline'}
              className={vista === 'mapa' ? 'h-9' : 'h-9 border-0 shadow-none'}
              onClick={() => setVista('mapa')}
            >
              <Map className="mr-2 size-4" />
              Ver mapa
            </Button>
          </div>
          <Button onClick={() => setCreando((actual) => !actual)}>
            {creando ? <X className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
            {creando ? 'Cerrar formulario' : 'Nueva solicitud'}
          </Button>
        </div>
      </div>
      {creando && session && (
        <SolicitudForm
          usuarioId={session.user.id}
          clienteId={null}
          comoGestor
          onCreated={() => setCreando(false)}
          onClose={() => setCreando(false)}
        />
      )}
      {trackingSeleccionada && (
        <div ref={panelRef} className="scroll-mt-24">
          <WorkspacePanel
            variant="management"
            icon={History}
            title={`Seguimiento #${trackingSeleccionada.numero}: ${trackingSeleccionada.nombre}`}
            description="Consulta exclusiva del historial de cambios y operaciones de esta solicitud."
            onClose={() => setTrackingSeleccionada(null)}
            closeLabel="Cerrar seguimiento"
          >
            <RequestTimeline solicitudId={trackingSeleccionada.id} />
          </WorkspacePanel>
        </div>
      )}
      {seleccionada && (
        <div ref={panelRef} className="scroll-mt-24">
          <WorkspacePanel
            variant="management"
            icon={Settings2}
            title={`Gestionar #${seleccionada.numero}: ${seleccionada.nombre}`}
            description="Actualice la solicitud, su asignación, estado y recursos asociados."
            actions={
              <Button
                variant="outline"
                size="sm"
                disabled={gestionar.isPending}
                onClick={() => void notificarCliente(seleccionada.id)}
              >
                <Mail className="mr-2 size-4" />
                Enviar correo al cliente
              </Button>
            }
            onClose={() => setSeleccionada(null)}
            closeLabel="Cerrar panel de modificación"
          >
            {' '}
            <div className="mb-4 rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-semibold">Ubicación de atención</p>
              <p>
                {seleccionada.ubicacion
                  ? `${seleccionada.ubicacion.nombre} · ${seleccionada.ubicacion.distrito}, ${seleccionada.ubicacion.canton}, ${seleccionada.ubicacion.provincia}`
                  : 'Ubicación no disponible'}
              </p>
              {seleccionada.ubicacion?.latitud != null &&
                seleccionada.ubicacion.longitud != null && (
                  <a
                    className="mt-2 inline-block font-medium text-primary hover:underline"
                    href={`https://www.google.com/maps?q=${seleccionada.ubicacion.latitud},${seleccionada.ubicacion.longitud}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consultar en el mapa
                  </a>
                )}
            </div>{' '}
            <RequestGeneralDataForm
              solicitud={seleccionada}
              operadorNombre={seleccionada.operador?.nombre_completo}
              onSaved={() => setSeleccionada(null)}
            />
            {peticionPendiente && (
              <div className="mt-4 space-y-3 rounded-xl border border-warning/30 bg-warning-soft p-4">
                <div>
                  <p className="font-semibold text-warning-soft-foreground">
                    Solicitud de {peticionPendiente.tipo === 'cierre' ? 'cierre' : 'cancelación'}{' '}
                    del Operador
                  </p>
                  <p className="mt-1 text-sm text-warning-soft-foreground">
                    {peticionPendiente.motivo}
                  </p>
                </div>
                <Textarea
                  value={comentarioPeticion}
                  placeholder="Comentario de la decisión (obligatorio al rechazar)"
                  onChange={(event) => setComentarioPeticion(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={gestionar.isPending}
                    onClick={() =>
                      void ejecutar({
                        accion: 'resolver_peticion',
                        solicitud_id: seleccionada.id,
                        peticion_id: peticionPendiente.id,
                        aprobar: true,
                        motivo: comentarioPeticion,
                      })
                    }
                  >
                    Aprobar petición
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive-soft"
                    disabled={gestionar.isPending || comentarioPeticion.trim().length < 5}
                    onClick={() =>
                      void ejecutar({
                        accion: 'resolver_peticion',
                        solicitud_id: seleccionada.id,
                        peticion_id: peticionPendiente.id,
                        aprobar: false,
                        motivo: comentarioPeticion,
                      })
                    }
                  >
                    Rechazar petición
                  </Button>
                </div>
              </div>
            )}
            {admiteReasignacion && (
              <div className="mt-4 grid gap-3 rounded-xl border bg-muted/40 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="grid gap-2 text-sm font-medium">
                  Reasignar a otro operador
                  <Select
                    value={operadorId}
                    onChange={(event) => setOperadorId(event.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {operadores.data?.map((operador) => (
                      <option key={operador.id} value={operador.id}>
                        {operador.nombre_completo}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button
                  disabled={
                    !operadorId || operadorId === seleccionada.operador_id || gestionar.isPending
                  }
                  onClick={() =>
                    void ejecutar({
                      accion: 'asignar',
                      solicitud_id: seleccionada.id,
                      prioridad: seleccionada.prioridad ?? prioridad,
                      operador_id: operadorId,
                    })
                  }
                >
                  Reasignar solicitud
                </Button>
              </div>
            )}
            {seleccionada.estado === 'creada' && (
              <p className="mt-4 rounded-md bg-warning-soft p-3 text-sm text-warning-soft-foreground">
                Borrador del Cliente: todavía no la ha enviado, así que no puede asignarse ni
                modificarse.
              </p>
            )}
            {seleccionada.estado === 'enviada' || seleccionada.estado === 'asignada' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Prioridad
                  <Select
                    value={prioridad}
                    onChange={(event) => setPrioridad(event.target.value as typeof prioridad)}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente (24 h)</option>
                  </Select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Operador
                  <Select
                    value={operadorId}
                    onChange={(event) => setOperadorId(event.target.value)}
                  >
                    <option value="">Seleccione…</option>
                    {operadores.data?.map((operador) => (
                      <option key={operador.id} value={operador.id}>
                        {operador.nombre_completo}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <Button
                    disabled={!operadorId || gestionar.isPending}
                    onClick={() =>
                      void ejecutar({
                        accion: 'asignar',
                        solicitud_id: seleccionada.id,
                        prioridad,
                        operador_id: operadorId,
                      })
                    }
                  >
                    {seleccionada.estado === 'enviada'
                      ? 'Asignar solicitud'
                      : 'Guardar reasignación'}
                  </Button>
                  {seleccionada.estado === 'enviada' && (
                    <Button
                      variant="outline"
                      className="text-destructive hover:bg-destructive-soft"
                      onClick={() => setEstado('rechazada')}
                    >
                      Rechazar
                    </Button>
                  )}
                </div>
                {estado === 'rechazada' && (
                  <div className="grid gap-3 sm:col-span-2">
                    <Textarea
                      placeholder="Motivo del rechazo"
                      value={motivo}
                      onChange={(event) => setMotivo(event.target.value)}
                    />
                    <Button
                      className="w-fit"
                      disabled={!motivo.trim()}
                      onClick={() =>
                        void ejecutar({ accion: 'rechazar', solicitud_id: seleccionada.id, motivo })
                      }
                    >
                      Confirmar rechazo
                    </Button>
                  </div>
                )}
              </div>
            ) : seleccionada.estado === 'cerrada' ? (
              <div className="mt-4">
                <Button
                  onClick={() =>
                    void ejecutar({ accion: 'reabrir', solicitud_id: seleccionada.id })
                  }
                  disabled={gestionar.isPending}
                >
                  Reabrir solicitud
                </Button>
              </div>
            ) : transicionesDisponibles(seleccionada).length ? (
              <div className="mt-4 grid gap-4">
                {seleccionada.estado === 'atendida' && (
                  <p className="text-sm text-muted-foreground">
                    Al cerrar, se le pedirá al Cliente una evaluación corta de satisfacción.
                  </p>
                )}
                <label className="grid gap-2 text-sm font-medium">
                  Nuevo estado
                  <Select
                    value={estado}
                    onChange={(event) => setEstado(event.target.value as EstadoSolicitud)}
                  >
                    {transicionesDisponibles(seleccionada).map((item) => (
                      <option key={item} value={item}>
                        {item.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </Select>
                </label>
                {estado === 'cancelada' && (
                  <Textarea
                    placeholder="Motivo de cancelación"
                    value={motivo}
                    onChange={(event) => setMotivo(event.target.value)}
                  />
                )}
                <Button
                  className="w-fit"
                  disabled={gestionar.isPending || (estado === 'cancelada' && !motivo.trim())}
                  onClick={() =>
                    void ejecutar({
                      accion: 'cambiar_estado',
                      solicitud_id: seleccionada.id,
                      estado,
                      motivo,
                    })
                  }
                >
                  Aplicar cambio
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Este estado no admite acciones adicionales.
              </p>
            )}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold">Información complementaria</h3>
              <p className="text-xs text-muted-foreground">
                Abra únicamente la sección que necesite consultar o actualizar.
              </p>
              <DisclosurePanel
                icon={Paperclip}
                title="Documentos adjuntos"
                description="Fotos y documentos que aportó el Cliente o se registraron en los avances."
              >
                <RequestAttachments solicitudId={seleccionada.id} />
              </DisclosurePanel>
              <DisclosurePanel
                icon={Package}
                title="Inventario asociado"
                description="Consulte o registre materiales utilizados en la solicitud."
              >
                <RequestMaterials solicitudId={seleccionada.id} />
              </DisclosurePanel>
              <DisclosurePanel
                icon={Users}
                title="Técnicos de la solicitud"
                description="Consulte y administre el personal técnico relacionado."
              >
                <RequestTechnicians solicitudId={seleccionada.id} />
              </DisclosurePanel>
              <DisclosurePanel
                icon={MessageSquare}
                title="Comunicación con el cliente"
                description="Envíe mensajes, adjuntos o proformas relacionados con la solicitud."
              >
                <RequestCommunications solicitudId={seleccionada.id} />
              </DisclosurePanel>
              <DisclosurePanel
                icon={Lock}
                title="Notas internas"
                description="Coordine con el resto del staff sin que el cliente lo vea."
              >
                <InternalRequestNotes solicitudId={seleccionada.id} />
              </DisclosurePanel>
              <DisclosurePanel
                icon={ShieldCheck}
                title="Garantía, llegada y equipo"
                description="Gestione la garantía e informe al cliente la llegada y las personas asignadas."
              >
                <RequestServiceFollowUp solicitudId={seleccionada.id} modo="gestor" />
              </DisclosurePanel>{' '}
              <DisclosurePanel
                icon={History}
                title="Seguimiento de la solicitud"
                description="Consulte el historial completo de cambios y operaciones."
              >
                <RequestTimeline solicitudId={seleccionada.id} />
              </DisclosurePanel>
            </div>
            <Button variant="outline" className="mt-4" onClick={() => setSeleccionada(null)}>
              Cerrar panel
            </Button>
          </WorkspacePanel>
        </div>
      )}
      {(solicitudes.error ?? operadores.error ?? gestionar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(solicitudes.error ?? operadores.error ?? gestionar.error)?.message}
        </p>
      )}
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_200px]">
        <Input
          type="search"
          placeholder="Buscar solicitud, Cliente, solicitante u operador…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="activas">Solicitudes activas</option>
          <option value="todas">Todos los estados (sin borradores)</option>
          <option value="enviada">Enviadas (por asignar)</option>
          <option value="asignada">Asignadas</option>
          <option value="en_atencion">En atención</option>
          <option value="atendida">Atendidas</option>
          <option value="cerrada">Cerradas</option>
          <option value="cancelada">Canceladas</option>
          <option value="creada">Borradores del Cliente (no enviadas)</option>
        </Select>
        <Select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as typeof sortBy)
            setPage(1)
          }}
        >
          <option value="recientes">Más recientes</option>
          <option value="prioridad">Mayor prioridad</option>
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
      {vista === 'mapa' ? (
        <SolicitudesMap solicitudes={ordenadas} onSelect={abrir} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {(
                  [
                    ['numero', 'Número'],
                    ['solicitud', 'Solicitud'],
                    ['cliente', 'Cliente'],
                    ['prioridad', 'Prioridad'],
                    ['estado', 'Estado'],
                    ['sla', 'SLA'],
                  ] as const
                ).map(([columna, etiqueta]) => (
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
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-t">
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <td key={cell} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-24" />
                      </td>
                    ))}
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : paginadas.length ? (
                paginadas.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.prioridad === 'alta' || item.prioridad === 'urgente'
                        ? 'border-t bg-warning-soft/50 hover:bg-warning-soft/70'
                        : 'border-t hover:bg-accent/50'
                    }
                  >
                    <td className="px-4 py-3">#{item.numero}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.nombre}</div>
                      <div className="text-xs text-muted-foreground">{item.tipo?.nombre}</div>
                      {item.original && (
                        <div className="mt-1 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          Garantía de #{item.original.numero}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{item.cliente?.nombre}</td>
                    <td className="px-4 py-3">
                      <Badge>{item.prioridad ?? 'Por definir'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div>{item.estado.replace(/_/g, ' ')}</div>
                      {item.peticiones.some((peticion) => peticion.estado === 'pendiente') && (
                        <Badge variant="warning" className="mt-1">
                          Petición pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SlaBadge
                        venceEn={item.sla_vence_en}
                        estado={item.estado}
                        prioridad={item.prioridad}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSeleccionada(null)
                            setTrackingSeleccionada(item)
                          }}
                        >
                          <History className="mr-2 size-4" />
                          Ver seguimiento
                        </Button>
                        <Button variant="outline" onClick={() => abrir(item)}>
                          Gestionar
                        </Button>
                        <Button variant="outline" onClick={() => setProgramando(item)}>
                          <CalendarClock className="mr-2 size-4" />
                          Programar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay solicitudes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <GridPagination
            page={currentPage}
            total={ordenadas.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      )}
      {programando && (
        <QuickScheduleDialog solicitud={programando} onClose={() => setProgramando(null)} />
      )}
    </section>
  )
}
