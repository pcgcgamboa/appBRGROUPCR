import { Bell, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/badge'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { GridPagination } from '@/components/molecules/grid-pagination'
import {
  useMarcarNotificacion,
  useNotificacionesInternas,
} from '@/features/notificaciones/hooks/use-notificaciones-internas'

const formato = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' })

export function InternalNotifications() {
  const listado = useNotificacionesInternas()
  const marcar = useMarcarNotificacion()
  const [tipo, setTipo] = useState('todos')
  const [estado, setEstado] = useState('no_leidas')
  const [orden, setOrden] = useState<'desc' | 'asc'>('desc')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const filtradas = (listado.data ?? [])
    .filter(
      (item) =>
        (tipo === 'todos' || item.tipo === tipo) &&
        (estado === 'todas' ||
          (estado === 'leidas' ? item.lecturas.length > 0 : !item.lecturas.length)) &&
        (!search.trim() ||
          `${item.titulo} ${item.mensaje}`
            .toLocaleLowerCase('es')
            .includes(search.toLocaleLowerCase('es'))),
    )
    .sort((a, b) =>
      orden === 'asc'
        ? a.creado_en.localeCompare(b.creado_en)
        : b.creado_en.localeCompare(a.creado_en),
    )
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtradas.length / 10)))
  const pagina = filtradas.slice((currentPage - 1) * 10, currentPage * 10)
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-primary" />
        <div>
          <h2 className="font-semibold">Notificaciones internas</h2>
          <p className="text-sm text-muted-foreground">
            Cambios de Clientes y bolsa de empleo pendientes de revisión.
          </p>
        </div>
      </div>
      {(listado.error || marcar.error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {(listado.error || marcar.error)?.message}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          placeholder="Buscar notificaciones…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <Select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value)
            setPage(1)
          }}
        >
          <option value="todos">Todos los tipos</option>
          <option value="bolsa_empleo">Bolsa de empleo</option>
          <option value="cliente">Clientes</option>
        </Select>
        <Select
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value)
            setPage(1)
          }}
        >
          <option value="no_leidas">No leídas</option>
          <option value="leidas">Leídas</option>
          <option value="todas">Todas</option>
        </Select>
        <Select
          value={orden}
          onChange={(e) => {
            setOrden(e.target.value as typeof orden)
            setPage(1)
          }}
        >
          <option value="desc">Más recientes</option>
          <option value="asc">Más antiguas</option>
        </Select>
      </div>
      <div className="space-y-3">
        {pagina.map((item) => {
          const leida = item.lecturas.length > 0
          return (
            <article
              key={item.id}
              className={
                leida
                  ? 'rounded-lg border p-4 opacity-70'
                  : 'rounded-lg border border-primary/30 bg-primary-soft/30 p-4'
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.titulo}</p>
                    {!leida && <Badge variant="warning">Nueva</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.mensaje}</p>
                  <time className="mt-2 block text-xs text-muted-foreground">
                    {formato.format(new Date(item.creado_en))}
                  </time>
                </div>
                <Button
                  variant="outline"
                  className="h-9"
                  disabled={marcar.isPending}
                  onClick={() => void marcar.mutateAsync({ id: item.id, leida: !leida })}
                >
                  <CheckCheck className="mr-2 size-4" />
                  {leida ? 'Marcar no leída' : 'Marcar leída'}
                </Button>
              </div>
            </article>
          )
        })}
        {!listado.isLoading && !pagina.length && (
          <p className="rounded-md bg-muted p-5 text-center text-sm text-muted-foreground">
            No hay notificaciones para los filtros seleccionados.
          </p>
        )}
      </div>
      <GridPagination
        page={currentPage}
        total={filtradas.length}
        pageSize={10}
        onPageChange={setPage}
      />
    </section>
  )
}
