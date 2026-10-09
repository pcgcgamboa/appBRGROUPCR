import { type FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useGestionHerramientas } from '@/features/inventario/hooks/use-asignaciones-herramientas'
import type { AsignacionHerramienta } from '@/features/inventario/types/inventario.types'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'
import { normalizarError } from '@/lib/errores'

// Fuera del componente: referencia estable entre renders — evita que useOrdenamiento reconstruya
// su lógica interna en cada tecla/clic (ver el mismo arreglo en bandeja-encargado-page.tsx).
const accesoresOrdenamiento = {
  herramienta: (item: AsignacionHerramienta) => item.herramienta?.nombre ?? null,
  activo: (item: AsignacionHerramienta) => item.herramienta?.numero_activo ?? null,
  asignadaA: (item: AsignacionHerramienta) => item.usuario?.nombre_completo ?? null,
  entrega: (item: AsignacionHerramienta) => item.asignada_en,
  observaciones: (item: AsignacionHerramienta) => item.observaciones_entrega,
}

export function ToolAssignments() {
  const gestion = useGestionHerramientas()
  const [herramientaId, setHerramientaId] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const asignaciones = gestion.asignaciones.data
  const activas = useMemo(
    () => asignaciones?.filter((item) => !item.devuelta_en) ?? [],
    [asignaciones],
  )
  const historial = useMemo(
    () => asignaciones?.filter((item) => item.devuelta_en) ?? [],
    [asignaciones],
  )
  const ocupadas = useMemo(() => new Set(activas.map((item) => item.herramienta_id)), [activas])
  const {
    datosOrdenados: activasOrdenadas,
    columnaActiva,
    direccion,
    ordenarPor,
  } = useOrdenamiento(activas, accesoresOrdenamiento)
  async function asignar(event: FormEvent) {
    event.preventDefault()
    await gestion.asignar.mutateAsync({
      herramienta_id: herramientaId,
      usuario_id: usuarioId,
      observaciones,
    })
    setHerramientaId('')
    setUsuarioId('')
    setObservaciones('')
  }
  async function devolver(id: string) {
    const detalle = window.prompt('Observaciones de la devolución (opcional)') ?? ''
    await gestion.devolver.mutateAsync({ asignacion_id: id, observaciones: detalle })
  }
  const error =
    gestion.herramientas.error ??
    gestion.personas.error ??
    gestion.asignaciones.error ??
    gestion.asignar.error ??
    gestion.devolver.error
  return (
    <section className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Asignación de herramientas</h2>
        <p className="text-sm text-muted-foreground">
          Controle la custodia de cada activo y conserve el historial de entregas y devoluciones.
        </p>
      </div>
      <form
        onSubmit={asignar}
        className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-3"
      >
        <label className="grid gap-2 text-sm font-medium">
          Herramienta
          <Select required value={herramientaId} onChange={(e) => setHerramientaId(e.target.value)}>
            <option value="">Seleccione…</option>
            {gestion.herramientas.data
              ?.filter((item) => item.activo && !ocupadas.has(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre} · {item.numero_activo}
                </option>
              ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Persona responsable
          <Select required value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
            <option value="">Seleccione…</option>
            {gestion.personas.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre_completo}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Observaciones
          <Input
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Estado, accesorios entregados…"
          />
        </label>
        <Button
          className="w-fit"
          disabled={gestion.asignar.isPending || !herramientaId || !usuarioId}
        >
          {gestion.asignar.isPending ? 'Asignando…' : 'Asignar herramienta'}
        </Button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {normalizarError(error).mensaje}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr>
              <ThOrdenable
                columna="herramienta"
                ordenActual={columnaActiva}
                direccion={direccion}
                onOrdenar={ordenarPor}
                className="p-3"
              >
                Herramienta
              </ThOrdenable>
              {(
                [
                  ['activo', 'Activo'],
                  ['asignadaA', 'Asignada a'],
                  ['entrega', 'Entrega'],
                  ['observaciones', 'Observaciones'],
                ] as const
              ).map(([columna, etiqueta]) => (
                <ThOrdenable
                  key={columna}
                  columna={columna}
                  ordenActual={columnaActiva}
                  direccion={direccion}
                  onOrdenar={ordenarPor}
                >
                  {etiqueta}
                </ThOrdenable>
              ))}
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {activasOrdenadas.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.herramienta?.nombre}</td>
                <td>{item.herramienta?.numero_activo}</td>
                <td>{item.usuario?.nombre_completo}</td>
                <td>{new Date(item.asignada_en).toLocaleString('es-CR')}</td>
                <td>{item.observaciones_entrega ?? '—'}</td>
                <td>
                  <Button
                    variant="outline"
                    disabled={gestion.devolver.isPending}
                    onClick={() => void devolver(item.id)}
                  >
                    Registrar devolución
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!activas.length && (
          <p className="p-5 text-center text-sm text-muted-foreground">
            No hay herramientas asignadas actualmente.
          </p>
        )}
      </div>
      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-semibold">
          Historial de devoluciones ({historial.length})
        </summary>
        <div className="mt-3 space-y-2">
          {historial.map((item) => (
            <div key={item.id} className="rounded-md bg-muted/30 p-3 text-sm">
              <p className="font-medium">
                {item.herramienta?.nombre} · {item.herramienta?.numero_activo}
              </p>
              <p>
                {item.usuario?.nombre_completo} ·{' '}
                {new Date(item.asignada_en).toLocaleDateString('es-CR')} →{' '}
                {item.devuelta_en ? new Date(item.devuelta_en).toLocaleDateString('es-CR') : ''}
              </p>
              {item.observaciones_devolucion && (
                <p className="text-muted-foreground">{item.observaciones_devolucion}</p>
              )}
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}
