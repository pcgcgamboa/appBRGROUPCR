import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
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
import { FormField } from '@/components/molecules/form-field'
import { PageHeader } from '@/components/molecules/page-header'
import { GridPagination } from '@/components/molecules/grid-pagination'
import { WorkspacePanel } from '@/components/molecules/workspace-panel'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type {
  CampoCatalogo,
  DatosFormulario,
  EntidadBase,
} from '@/features/catalogos/types/catalogos.types'

interface CatalogManagerProps<T> {
  tabla: string
  title: string
  description: string
  fields: CampoCatalogo[]
  columns: string[]
  columnLabels: Record<string, string>
  extraFormContent?:
    | ReactNode
    | ((values: DatosFormulario, setValues: Dispatch<SetStateAction<DatosFormulario>>) => ReactNode)
  onOpenNew?: () => void
  onOpenEdit?: (item: T) => void
  onSaved?: (id: string | number) => Promise<void>
  extraActions?: (item: T) => ReactNode
  headerActions?: ReactNode
  defaultValues?: DatosFormulario
  filterItem?: (item: T) => boolean
  renderCell?: (item: T, column: string) => ReactNode
}

function valoresIniciales(fields: CampoCatalogo[]) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.type === 'checkbox' ? true : '']),
  ) as DatosFormulario
}

export function CatalogManager<T extends EntidadBase>({
  tabla,
  title,
  description,
  fields,
  columns,
  columnLabels,
  extraFormContent,
  onOpenNew,
  onOpenEdit,
  onSaved,
  extraActions,
  headerActions,
  defaultValues,
  filterItem,
  renderCell,
}: CatalogManagerProps<T>) {
  const { listado, guardar, eliminar } = useCatalogo<T>(tabla)
  const initialValues = useMemo(
    () => ({ ...valoresIniciales(fields), ...defaultValues }),
    [defaultValues, fields],
  )
  const [formVisible, setFormVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | number | undefined>()
  const [values, setValues] = useState<DatosFormulario>(initialValues)
  const [extraError, setExtraError] = useState<Error | null>(null)
  const [itemAEliminar, setItemAEliminar] = useState<T | null>(null)
  const ultimoDisparadorRef = useRef<HTMLElement | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const processed = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return [...(listado.data ?? [])]
      .filter((item) => !filterItem || filterItem(item))
      .filter((item) => {
        const record = item as unknown as Record<string, unknown>
        const matchesSearch =
          !term ||
          columns.some((column) =>
            String(record[column] ?? '')
              .toLocaleLowerCase('es')
              .includes(term),
          )
        const matchesStatus =
          status === 'todos' ||
          (status === 'activos'
            ? record.activo !== false && record.estado !== 'mantenimiento'
            : record.activo === false || record.estado === 'mantenimiento')
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const left = a as unknown as Record<string, unknown>
        const right = b as unknown as Record<string, unknown>
        if (tabla === 'vehiculos') {
          const score = (r: Record<string, unknown>) =>
            r.activo === false ? 2 : r.estado === 'mantenimiento' ? 1 : 0
          const difference = score(left) - score(right)
          if (difference) return difference
        }
        if (left.creado_en && right.creado_en)
          return String(right.creado_en).localeCompare(String(left.creado_en))
        return String(left[columns[0]] ?? '').localeCompare(String(right[columns[0]] ?? ''), 'es')
      })
  }, [columns, filterItem, listado.data, search, status, tabla])
  const currentPage = Math.min(page, Math.max(1, Math.ceil(processed.length / pageSize)))
  const paginated = processed.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const supportsStatus = (listado.data ?? []).some((item) => {
    const record = item as unknown as Record<string, unknown>
    return 'activo' in record || 'estado' in record
  })
  useEffect(() => setPage(1), [search, status, pageSize])

  function abrirNuevo() {
    ultimoDisparadorRef.current = document.activeElement as HTMLElement
    setEditingId(undefined)
    setExtraError(null)
    setValues(initialValues)
    setFormVisible(true)
    onOpenNew?.()
  }

  function abrirEdicion(item: T) {
    ultimoDisparadorRef.current = document.activeElement as HTMLElement
    const record = item as unknown as Record<string, unknown>
    setEditingId(item.id)
    setExtraError(null)
    setValues({
      ...defaultValues,
      ...Object.fromEntries(
        fields.map((field) => [
          field.name,
          (record[field.name] as string | number | boolean | null) ?? '',
        ]),
      ),
    })
    setFormVisible(true)
    onOpenEdit?.(item)
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    const payload = {
      ...defaultValues,
      ...Object.fromEntries(
        fields.map((field) => {
          const visible =
            !field.visibleWhen || values[field.visibleWhen.field] === field.visibleWhen.equals
          if (!visible) return [field.name, null]
          const value = values[field.name]
          if (field.type === 'number') return [field.name, value === '' ? null : Number(value)]
          if (!field.required && value === '') return [field.name, null]
          return [field.name, value]
        }),
      ),
    } as DatosFormulario
    const idGuardado = await guardar.mutateAsync({ id: editingId, values: payload })
    try {
      await onSaved?.(idGuardado)
    } catch (error) {
      setExtraError(
        error instanceof Error ? error : new Error('No fue posible completar la operaciÃ³n.'),
      )
      return
    }
    toast.success(
      editingId ? 'Registro actualizado correctamente.' : 'Registro creado correctamente.',
    )
    setFormVisible(false)
  }

  async function confirmarEliminar() {
    if (!itemAEliminar) return
    await eliminar.mutateAsync(itemAEliminar.id)
    toast.success('Registro eliminado correctamente.')
    setItemAEliminar(null)
  }

  const formError = guardar.error ?? extraError
  const deleteError = eliminar.error
  const pageError = listado.error

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={title} description={description} />
        <div className="flex flex-wrap gap-2">
          {headerActions}
          <Button onClick={abrirNuevo}>
            <Plus className="mr-2 size-4" />
            Nuevo registro
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
            <DialogTitle>{editingId ? 'Editar registro' : 'Nuevo registro'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Actualice los datos del registro y guarde los cambios.'
                : 'Complete los datos para crear un nuevo registro.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const visible =
                !field.visibleWhen || values[field.visibleWhen.field] === field.visibleWhen.equals
              if (!visible) return null
              return (
                <div
                  key={field.name}
                  className={
                    field.type === 'textarea' || field.type === 'checkbox'
                      ? 'sm:col-span-2'
                      : undefined
                  }
                >
                  {field.type === 'textarea' ? (
                    <label
                      htmlFor={`campo-${field.name}`}
                      className="grid gap-2 text-sm font-medium"
                    >
                      {field.label}
                      <Textarea
                        id={`campo-${field.name}`}
                        required={field.required}
                        value={String(values[field.name] ?? '')}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.name]: event.target.value }))
                        }
                      />
                    </label>
                  ) : field.type === 'select' ? (
                    <label
                      htmlFor={`campo-${field.name}`}
                      className="grid gap-2 text-sm font-medium"
                    >
                      {field.label}
                      <Select
                        id={`campo-${field.name}`}
                        required={field.required}
                        value={String(values[field.name] ?? '')}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.name]: event.target.value }))
                        }
                      >
                        <option value="">Seleccioneâ€¦</option>
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                  ) : field.type === 'checkbox' ? (
                    <label
                      htmlFor={`campo-${field.name}`}
                      className="flex items-center gap-2 text-sm font-medium"
                    >
                      <Checkbox
                        id={`campo-${field.name}`}
                        checked={Boolean(values[field.name])}
                        onCheckedChange={(checked) =>
                          setValues((current) => ({ ...current, [field.name]: checked === true }))
                        }
                      />
                      {field.label}
                    </label>
                  ) : (
                    <FormField
                      id={`campo-${field.name}`}
                      label={field.label}
                      type={field.type ?? 'text'}
                      step={field.step}
                      required={field.required}
                      value={String(values[field.name] ?? '')}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.name]: event.target.value }))
                      }
                    />
                  )}
                </div>
              )
            })}
            {typeof extraFormContent === 'function'
              ? extraFormContent(values, setValues)
              : extraFormContent}
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
                {guardar.isPending ? 'Guardandoâ€¦' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(itemAEliminar)}
        onOpenChange={(open) => !open && setItemAEliminar(null)}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            ultimoDisparadorRef.current?.focus()
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Â¿Eliminar este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acciÃ³n puede estar restringida si el registro tiene informaciÃ³n asociada. No se
              puede deshacer.
            </AlertDialogDescription>
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
              {eliminar.isPending ? 'Eliminandoâ€¦' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pageError && (
        <p
          role="alert"
          className="rounded-md bg-destructive-soft p-3 text-sm text-destructive-soft-foreground"
        >
          {pageError.message}
        </p>
      )}

      <WorkspacePanel
        variant="list"
        icon={ListChecks}
        title="Listado de registros"
        description="Consulte, filtre y seleccione los registros que desea administrar."
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px]">
          <Input
            type="search"
            placeholder="Buscar en el listadoâ€¦"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {supportsStatus && (
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todos">Todos los registros</option>
              <option value="activos">Activos / funcionales</option>
              <option value="inactivos">Inactivos / no disponibles</option>
            </Select>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3 font-semibold">
                    {columnLabels[column]}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {listado.isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-t">
                    {columns.map((column) => (
                      <td key={column} className="px-4 py-3">
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
              ) : paginated.length ? (
                paginated.map((item) => {
                  const record = item as unknown as Record<string, unknown>
                  return (
                    <tr key={item.id} className="border-t transition-colors hover:bg-accent/50">
                      {columns.map((column) => (
                        <td key={column} className="px-4 py-3">
                          {renderCell
                            ? renderCell(item, column)
                            : typeof record[column] === 'boolean'
                              ? record[column]
                                ? 'SÃ­'
                                : 'No'
                              : String(record[column] ?? 'â€”')}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {extraActions?.(item)}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => abrirEdicion(item)}
                            aria-label="Editar"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive hover:bg-destructive-soft"
                            onClick={(event) => {
                              ultimoDisparadorRef.current = event.currentTarget
                              setItemAEliminar(item)
                            }}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No hay registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <GridPagination
            page={currentPage}
            total={processed.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </WorkspacePanel>
    </section>
  )
}
