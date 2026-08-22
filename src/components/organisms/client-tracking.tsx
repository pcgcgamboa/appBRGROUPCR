import { useEffect, useState } from 'react'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { GridPagination } from '@/components/molecules/grid-pagination'
import { useTrackingCliente } from '@/features/cliente/hooks/use-tracking-cliente'
import { normalizarError } from '@/lib/errores'

const fecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })
const pageSize = 10

export function ClientTracking({ clienteId }: { clienteId: string }) {
  const tracking = useTrackingCliente(clienteId)
  const [solicitud, setSolicitud] = useState('todas')
  const [tipo, setTipo] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(1)
  const solicitudes = Array.from(
    new Map(tracking.data?.map((x) => [x.solicitud_id, x.solicitud]) ?? []),
  )
  const term = search.trim().toLocaleLowerCase('es')
  const filtrado = (tracking.data ?? [])
    .filter(
      (x) =>
        (solicitud === 'todas' || x.solicitud_id === solicitud) &&
        (tipo === 'todos' || x.tipo === tipo) &&
        (!desde || x.creado_en >= `${desde}T00:00:00`) &&
        (!hasta || x.creado_en <= `${hasta}T23:59:59.999`) &&
        (!term ||
          [
            x.solicitud?.numero,
            x.solicitud?.nombre,
            x.titulo,
            x.descripcion,
            x.actor?.nombre_completo,
            x.tipo,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase('es')
            .includes(term)),
    )
    .sort((a, b) =>
      order === 'asc'
        ? a.creado_en.localeCompare(b.creado_en)
        : b.creado_en.localeCompare(a.creado_en),
    )
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtrado.length / pageSize)))
  const paginado = filtrado.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  useEffect(() => setPage(1), [solicitud, tipo, desde, hasta, search, order])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Tracking de transacciones</h2>
        <p className="text-sm text-muted-foreground">
          Consulte cambios, mensajes, proformas y operaciones de sus solicitudes.
        </p>
      </div>
      {tracking.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(tracking.error).mensaje}
        </p>
      )}
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          className="lg:col-span-2"
          type="search"
          placeholder="Buscar por contenido, solicitud o responsable…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={order} onChange={(e) => setOrder(e.target.value as typeof order)}>
          <option value="desc">Más recientes primero</option>
          <option value="asc">Más antiguos primero</option>
        </Select>
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="todos">Todos los movimientos</option>
          <option value="automatizacion">Automatizaciones</option>
          <option value="estado">Estados</option>
          <option value="avance">Avances</option>
          <option value="comunicacion">Mensajes y proformas</option>
          <option value="material">Materiales</option>
          <option value="movimiento_flota">Flota</option>
          <option value="validacion">Validaciones</option>
        </Select>
        <Select value={solicitud} onChange={(e) => setSolicitud(e.target.value)}>
          <option value="todas">Todas las solicitudes</option>
          {solicitudes.map(([id, item]) => (
            <option key={id} value={id}>
              #{item?.numero} {item?.nombre}
            </option>
          ))}
        </Select>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Desde
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Hasta
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>
      <div className="space-y-3">
        {paginado.map((x) => (
          <article key={x.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="text-xs text-primary">Solicitud #{x.solicitud?.numero}</p>
                <p className="font-medium">{x.titulo}</p>
              </div>
              <time className="text-xs text-muted-foreground">
                {fecha.format(new Date(x.creado_en))}
              </time>
            </div>
            {x.descripcion && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {x.descripcion}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Por {x.actor?.nombre_completo ?? 'Sistema'}
            </p>
          </article>
        ))}
        {!tracking.isLoading && !filtrado.length && (
          <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No hay transacciones para los filtros seleccionados.
          </p>
        )}
      </div>
      <GridPagination
        page={currentPage}
        total={filtrado.length}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </section>
  )
}
