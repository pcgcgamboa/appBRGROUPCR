import { Pencil, Plus, Trash2, Wrench, X } from 'lucide-react'
import { type FormEvent, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Checkbox } from '@/components/atoms/checkbox'
import { Skeleton } from '@/components/atoms/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/atoms/alert-dialog'
import { ThOrdenable } from '@/components/atoms/th-ordenable'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type {
  Cliente,
  DatosFormulario,
  EquipoCliente,
} from '@/features/catalogos/types/catalogos.types'
import { useOrdenamiento } from '@/hooks/use-ordenamiento'

interface FormularioEquipo {
  nombre: string
  marca: string
  modelo: string
  serie: string
  activo: boolean
}

const inicial: FormularioEquipo = { nombre: '', marca: '', modelo: '', serie: '', activo: true }

// Fuera del componente: referencia estable entre renders — evita que useOrdenamiento reconstruya
// su lógica interna en cada clic (ver el mismo arreglo en bandeja-encargado-page.tsx).
const accesoresOrdenamiento = {
  nombre: (item: EquipoCliente) => item.nombre,
  marca: (item: EquipoCliente) => item.marca,
  modelo: (item: EquipoCliente) => item.modelo,
  serie: (item: EquipoCliente) => item.serie,
  activo: (item: EquipoCliente) => (item.activo ? 1 : 0),
}

export function ClientEquipmentManager({
  cliente,
  onClose,
}: {
  cliente: Cliente
  onClose: () => void
}) {
  const { listado, guardar, eliminar } = useCatalogo<EquipoCliente>('equipos_cliente')
  const [formVisible, setFormVisible] = useState(false)
  const [editingId, setEditingId] = useState<string>()
  const [values, setValues] = useState<FormularioEquipo>(inicial)
  const [equipoAEliminar, setEquipoAEliminar] = useState<EquipoCliente | null>(null)
  const ultimoDisparadorRef = useRef<HTMLElement | null>(null)
  const equiposCliente = useMemo(
    () => listado.data?.filter((item) => item.cliente_id === cliente.id) ?? [],
    [listado.data, cliente.id],
  )
  const {
    datosOrdenados: equipos,
    columnaActiva,
    direccion,
    ordenarPor,
  } = useOrdenamiento(equiposCliente, accesoresOrdenamiento)

  function nuevo() {
    ultimoDisparadorRef.current = document.activeElement as HTMLElement
    setEditingId(undefined)
    setValues(inicial)
    setFormVisible(true)
  }

  function editar(equipo: EquipoCliente) {
    ultimoDisparadorRef.current = document.activeElement as HTMLElement
    setEditingId(equipo.id)
    setValues({
      nombre: equipo.nombre,
      marca: equipo.marca ?? '',
      modelo: equipo.modelo ?? '',
      serie: equipo.serie ?? '',
      activo: equipo.activo,
    })
    setFormVisible(true)
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    const payload: DatosFormulario = {
      cliente_id: cliente.id,
      nombre: values.nombre,
      marca: values.marca || null,
      modelo: values.modelo || null,
      serie: values.serie || null,
      activo: values.activo,
    }
    await guardar.mutateAsync({ id: editingId, values: payload })
    toast.success(editingId ? 'Equipo actualizado correctamente.' : 'Equipo creado correctamente.')
    setFormVisible(false)
  }

  async function confirmarEliminar() {
    if (!equipoAEliminar) return
    await eliminar.mutateAsync(equipoAEliminar.id)
    toast.success('Equipo eliminado correctamente.')
    setEquipoAEliminar(null)
  }

  const pageError = listado.error
  const formError = guardar.error
  const deleteError = eliminar.error

  return (
    <section className="scroll-mt-24 space-y-5 rounded-2xl border border-primary/20 bg-card p-5 shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Wrench className="size-5" />
            <p className="text-sm font-semibold uppercase tracking-wide">Equipos del cliente</p>
          </div>
          <h2 className="mt-1 text-2xl font-bold">{cliente.nombre}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario de equipos seleccionable al crear una solicitud para este cliente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={nuevo}>
            <Plus className="mr-2 size-4" /> Nuevo equipo
          </Button>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Cerrar equipos">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog open={formVisible} onOpenChange={setFormVisible}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            ultimoDisparadorRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Actualice los datos del equipo y guarde los cambios.'
                : 'Complete los datos del equipo de este cliente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Nombre
              <Input
                required
                value={values.nombre}
                onChange={(e) => setValues({ ...values, nombre: e.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Marca
              <Input
                value={values.marca}
                onChange={(e) => setValues({ ...values, marca: e.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Modelo
              <Input
                value={values.modelo}
                onChange={(e) => setValues({ ...values, modelo: e.target.value })}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Serie
              <Input
                value={values.serie}
                onChange={(e) => setValues({ ...values, serie: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
              <Checkbox
                checked={values.activo}
                onCheckedChange={(checked) => setValues({ ...values, activo: checked === true })}
              />
              Equipo activo
            </label>
            {formError && (
              <p
                role="alert"
                className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground sm:col-span-2"
              >
                {formError.message}
              </p>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? 'Guardando…' : 'Guardar equipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(equipoAEliminar)}
        onOpenChange={(open) => !open && setEquipoAEliminar(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            ultimoDisparadorRef.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{equipoAEliminar?.nombre}”?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p
              role="alert"
              className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
            >
              {deleteError.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminar.isPending}
              onClick={(event) => {
                event.preventDefault()
                void confirmarEliminar()
              }}
            >
              {eliminar.isPending ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pageError && (
        <p
          role="alert"
          className="rounded-lg bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {pageError.message}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              {(
                [
                  ['nombre', 'Nombre'],
                  ['marca', 'Marca'],
                  ['modelo', 'Modelo'],
                  ['serie', 'Serie'],
                  ['activo', 'Activo'],
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
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {listado.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={index} className="border-t">
                  {Array.from({ length: 5 }).map((__, cell) => (
                    <td key={cell} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Skeleton className="size-9 rounded-lg" />
                      <Skeleton className="size-9 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            ) : equipos.length ? (
              equipos.map((equipo) => (
                <tr key={equipo.id} className="border-t transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3 font-medium">{equipo.nombre}</td>
                  <td className="px-4 py-3">{equipo.marca ?? '—'}</td>
                  <td className="px-4 py-3">{equipo.modelo ?? '—'}</td>
                  <td className="px-4 py-3">{equipo.serie ?? '—'}</td>
                  <td className="px-4 py-3">{equipo.activo ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => editar(equipo)}
                        aria-label={`Editar ${equipo.nombre}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:bg-destructive-soft"
                        onClick={(event) => {
                          ultimoDisparadorRef.current = event.currentTarget
                          setEquipoAEliminar(equipo)
                        }}
                        aria-label={`Eliminar ${equipo.nombre}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Este cliente todavía no tiene equipos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
