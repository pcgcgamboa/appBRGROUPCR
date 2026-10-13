import { FileText, History, ListChecks, Paperclip, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { Skeleton } from '@/components/atoms/skeleton'
import { DisclosurePanel } from '@/components/molecules/disclosure-panel'
import { PageHeader } from '@/components/molecules/page-header'
import { WorkspacePanel } from '@/components/molecules/workspace-panel'
import { RequestAttachments } from '@/components/organisms/request-attachments'
import { RequestTimeline } from '@/components/organisms/request-timeline'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type { Rol } from '@/features/catalogos/types/catalogos.types'
import { useSolicitudesAdmin } from '@/features/solicitudes/hooks/use-solicitudes-admin'
import type {
  EstadoSolicitud,
  SolicitudAdmin,
} from '@/features/solicitudes/types/solicitudes.types'
import { useUsuariosAdmin } from '@/features/usuarios/hooks/use-usuarios-admin'

function normalizarBusqueda(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

const transiciones: Record<EstadoSolicitud, EstadoSolicitud[]> = {
  // Borrador del Cliente: el proveedor no actúa sobre él hasta que se envía.
  creada: ['creada'],
  enviada: ['enviada', 'rechazada', 'cancelada'],
  asignada: ['asignada', 'en_atencion', 'cancelada'],
  en_atencion: ['en_atencion', 'en_espera_materiales', 'atendida', 'cancelada'],
  en_espera_materiales: ['en_espera_materiales', 'en_atencion', 'atendida', 'cancelada'],
  atendida: ['atendida', 'cerrada', 'en_atencion', 'cancelada'],
  cerrada: ['cerrada', 'asignada'],
  cancelada: ['cancelada'],
  rechazada: ['rechazada'],
}

export function SolicitudesAdminPage() {
  const { solicitudes, intervenir } = useSolicitudesAdmin()
  const { usuarios } = useUsuariosAdmin()
  const { listado: roles } = useCatalogo<Rol>('roles')
  const [seleccionada, setSeleccionada] = useState<SolicitudAdmin | null>(null)
  const [estado, setEstado] = useState<EstadoSolicitud>('creada')
  const [operadorId, setOperadorId] = useState<string>('')
  const [motivo, setMotivo] = useState('')
  const [search, setSearch] = useState('')
  const [verBorradores, setVerBorradores] = useState(false)
  const operadorRolId = roles.data?.find((rol) => rol.codigo === 'operador')?.id
  const operadores =
    usuarios.data?.filter(
      (usuario) =>
        usuario.activo && usuario.usuario_roles.some((rol) => rol.rol_id === operadorRolId),
    ) ?? []
  const term = normalizarBusqueda(search)
  // Los borradores del Cliente no le llegan al proveedor salvo que los consulte explícitamente.
  const solicitudesFiltradas = (solicitudes.data ?? []).filter(
    (solicitud) =>
      (verBorradores ? solicitud.estado === 'creada' : solicitud.estado !== 'creada') &&
      normalizarBusqueda(
        [
          solicitud.numero,
          solicitud.nombre,
          solicitud.cliente?.nombre,
          solicitud.operador?.nombre_completo,
          solicitud.solicitante?.nombre_completo,
        ]
          .filter(Boolean)
          .join(' '),
      ).includes(term),
  )
  const requiereOperador = [
    'asignada',
    'en_atencion',
    'en_espera_materiales',
    'atendida',
    'cerrada',
  ].includes(estado)

  function abrir(solicitud: SolicitudAdmin) {
    setSeleccionada(solicitud)
    setEstado(solicitud.estado)
    setOperadorId(solicitud.operador_id ?? '')
    setMotivo(solicitud.motivo_rechazo_cancelacion ?? '')
  }
  async function guardar() {
    if (!seleccionada) return
    await intervenir.mutateAsync({
      id: seleccionada.id,
      estado,
      operador_id: operadorId || null,
      motivo_rechazo_cancelacion:
        estado === 'cancelada' || estado === 'rechazada' ? motivo || null : null,
    })
    setSeleccionada(null)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Solicitudes activas"
        description="Intervención administrativa para reasignar, cerrar o cancelar servicios."
      />
      {(solicitudes.error ?? intervenir.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(solicitudes.error ?? intervenir.error)?.message}
        </p>
      )}
      <WorkspacePanel
        variant="list"
        icon={ListChecks}
        title="Listado de solicitudes"
        description="Busque y seleccione una solicitud para realizar una intervención administrativa."
      >
        <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-medium">
            Buscar por usuario o solicitud
            <Input
              type="search"
              placeholder="Digite el nombre o una parte del nombre del solicitante u operador…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4"
              checked={verBorradores}
              onChange={(event) => setVerBorradores(event.target.checked)}
            />
            Ver solo borradores del Cliente
          </label>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Solicitud</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-t">
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <td key={cell} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-24" />
                      </td>
                    ))}
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : solicitudesFiltradas.length ? (
                solicitudesFiltradas.map((solicitud) => (
                  <tr key={solicitud.id} className="border-t transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3">#{solicitud.numero}</td>
                    <td className="px-4 py-3 font-medium">{solicitud.nombre}</td>
                    <td className="px-4 py-3">{solicitud.cliente?.nombre}</td>
                    <td className="px-4 py-3">
                      <Badge>{solicitud.estado.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {solicitud.solicitante?.nombre_completo ?? 'Sin identificar'}
                    </td>
                    <td className="px-4 py-3">
                      {solicitud.operador?.nombre_completo ?? 'Sin asignar'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" onClick={() => abrir(solicitud)}>
                        <Wrench className="mr-2 size-4" />
                        Intervenir
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay solicitudes que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </WorkspacePanel>
      {seleccionada && (
        <WorkspacePanel
          variant="management"
          icon={Wrench}
          title={`Intervenir #${seleccionada.numero}: ${seleccionada.nombre}`}
          description="Actualice la asignación o el estado de esta solicitud."
          onClose={() => setSeleccionada(null)}
        >
          <div className="space-y-3">
            <DisclosurePanel
              icon={FileText}
              title="Datos de la solicitud"
              description="Información registrada por el Cliente y la gestión del proveedor."
            >
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ['Cliente', seleccionada.cliente?.nombre],
                    ['Tipo', seleccionada.tipo?.nombre],
                    ['Estado', seleccionada.estado.replace(/_/g, ' ')],
                    ['Prioridad', seleccionada.prioridad ?? 'Sin definir'],
                    ['Solicitante', seleccionada.solicitante?.nombre_completo],
                    ['Operador', seleccionada.operador?.nombre_completo],
                    [
                      'Ubicación',
                      seleccionada.ubicacion
                        ? `${seleccionada.ubicacion.nombre} — ${seleccionada.ubicacion.provincia}, ${seleccionada.ubicacion.canton}, ${seleccionada.ubicacion.distrito}`
                        : null,
                    ],
                    ['Creada', new Date(seleccionada.creado_en).toLocaleString('es-CR')],
                    [
                      'Fecha límite (SLA)',
                      seleccionada.sla_vence_en
                        ? new Date(seleccionada.sla_vence_en).toLocaleString('es-CR')
                        : null,
                    ],
                  ] as const
                ).map(([etiqueta, valor]) => (
                  <div key={etiqueta}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {etiqueta}
                    </dt>
                    <dd className="mt-0.5">{valor ?? '—'}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Detalle
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap">{seleccionada.detalle}</dd>
                </div>
              </dl>
            </DisclosurePanel>
            <DisclosurePanel
              icon={Paperclip}
              title="Documentos adjuntos"
              description="Fotos y documentos que aportó el Cliente o se registraron en los avances."
            >
              <RequestAttachments solicitudId={seleccionada.id} />
            </DisclosurePanel>
            <DisclosurePanel
              icon={History}
              title="Seguimiento de la solicitud"
              description="Historial completo de cambios y operaciones."
            >
              <RequestTimeline solicitudId={seleccionada.id} />
            </DisclosurePanel>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Operador
              <Select value={operadorId} onChange={(event) => setOperadorId(event.target.value)}>
                <option value="">Sin asignar</option>
                {operadores.map((operador) => (
                  <option key={operador.id} value={operador.id}>
                    {operador.nombre_completo}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Estado
              <Select
                required={requiereOperador}
                value={estado}
                onChange={(event) => setEstado(event.target.value as EstadoSolicitud)}
              >
                {transiciones[seleccionada.estado].map((item) => (
                  <option key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </label>
            {(estado === 'cancelada' || estado === 'rechazada') && (
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                Motivo
                <Textarea
                  required
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                />
              </label>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <Button
              onClick={() => void guardar()}
              disabled={intervenir.isPending || (requiereOperador && !operadorId)}
            >
              {intervenir.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant="outline" onClick={() => setSeleccionada(null)}>
              Cancelar
            </Button>
          </div>
        </WorkspacePanel>
      )}
    </section>
  )
}
