import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/atoms/button'
import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'
import { Textarea } from '@/components/atoms/textarea'
import { PageHeader } from '@/components/molecules/page-header'
import { useCatalogo } from '@/features/catalogos/hooks/use-catalogo'
import type {
  CampoCatalogo,
  DatosFormulario,
  EntidadBase,
} from '@/features/catalogos/types/catalogos.types'

interface CatalogManagerProps {
  tabla: string
  title: string
  description: string
  fields: CampoCatalogo[]
  columns: string[]
  columnLabels: Record<string, string>
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
}: CatalogManagerProps) {
  const { listado, guardar, eliminar } = useCatalogo<T>(tabla)
  const initialValues = useMemo(() => valoresIniciales(fields), [fields])
  const [formVisible, setFormVisible] = useState(false)
  const [editingId, setEditingId] = useState<string | number | undefined>()
  const [values, setValues] = useState<DatosFormulario>(initialValues)

  function abrirNuevo() {
    setEditingId(undefined)
    setValues(initialValues)
    setFormVisible(true)
  }

  function abrirEdicion(item: T) {
    const record = item as unknown as Record<string, unknown>
    setEditingId(item.id)
    setValues(
      Object.fromEntries(
        fields.map((field) => [
          field.name,
          (record[field.name] as string | number | boolean | null) ?? '',
        ]),
      ),
    )
    setFormVisible(true)
  }

  async function enviar(event: FormEvent) {
    event.preventDefault()
    const payload = Object.fromEntries(
      fields.map((field) => {
        const value = values[field.name]
        if (field.type === 'number') return [field.name, value === '' ? null : Number(value)]
        if (!field.required && value === '') return [field.name, null]
        return [field.name, value]
      }),
    ) as DatosFormulario
    await guardar.mutateAsync({ id: editingId, values: payload })
    setFormVisible(false)
  }

  async function confirmarEliminar(item: T) {
    if (
      window.confirm(
        '¿Desea eliminar este registro? Esta acción puede estar restringida si tiene información asociada.',
      )
    ) {
      await eliminar.mutateAsync(item.id)
    }
  }

  const error = listado.error ?? guardar.error ?? eliminar.error

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={title} description={description} />
        <Button onClick={abrirNuevo}>
          <Plus className="mr-2 size-4" />
          Nuevo registro
        </Button>
      </div>

      {formVisible && (
        <form
          onSubmit={enviar}
          className="grid gap-4 rounded-lg border bg-white p-5 shadow-sm sm:grid-cols-2"
        >
          <div className="flex items-center justify-between sm:col-span-2">
            <h2 className="font-semibold">{editingId ? 'Editar registro' : 'Nuevo registro'}</h2>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              onClick={() => setFormVisible(false)}
              aria-label="Cerrar formulario"
            >
              <X className="size-4" />
            </Button>
          </div>
          {fields.map((field) => (
            <label
              key={field.name}
              className={
                field.type === 'textarea'
                  ? 'grid gap-2 text-sm font-medium sm:col-span-2'
                  : 'grid gap-2 text-sm font-medium'
              }
            >
              {field.label}
              {field.type === 'textarea' ? (
                <Textarea
                  required={field.required}
                  value={String(values[field.name] ?? '')}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
              ) : field.type === 'select' ? (
                <Select
                  required={field.required}
                  value={String(values[field.name] ?? '')}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                >
                  <option value="">Seleccione…</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === 'checkbox' ? (
                <input
                  className="size-5"
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.checked }))
                  }
                />
              ) : (
                <Input
                  type={field.type ?? 'text'}
                  step={field.step}
                  required={field.required}
                  value={String(values[field.name] ?? '')}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }
                />
              )}
            </label>
          ))}
          <div className="flex gap-3 sm:col-span-2">
            <Button type="submit" disabled={guardar.isPending}>
              {guardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormVisible(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted">
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
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Cargando…
                </td>
              </tr>
            ) : listado.data?.length ? (
              listado.data.map((item) => {
                const record = item as unknown as Record<string, unknown>
                return (
                  <tr key={item.id} className="border-t">
                    {columns.map((column) => (
                      <td key={column} className="px-4 py-3">
                        {typeof record[column] === 'boolean'
                          ? record[column]
                            ? 'Sí'
                            : 'No'
                          : String(record[column] ?? '—')}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="h-9 px-3"
                          onClick={() => abrirEdicion(item)}
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 px-3 text-red-700"
                          onClick={() => void confirmarEliminar(item)}
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
      </div>
    </section>
  )
}
