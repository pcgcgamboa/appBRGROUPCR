import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'

export type ValorOrdenable = string | number | null

export type AccesoresOrdenamiento<T> = Record<string, (item: T) => ValorOrdenable>

function compararValores(a: ValorOrdenable, b: ValorOrdenable): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' })
}

/**
 * Ordenamiento por columna reutilizable para las tablas del sistema. Envuelve el motor de
 * ordenamiento de @tanstack/react-table (locale-aware, null-safe vía `compararValores`) sin
 * adoptar su renderizado — cada tabla sigue dibujando su propio `<thead>`/`<tbody>`, este hook
 * solo decide el orden de `datosOrdenados` y expone el estado para el botón de encabezado
 * (`ThOrdenable`, en `src/components/atoms/th-ordenable.tsx`).
 *
 * `accesores` mapea el id de cada columna ordenable a una función que extrae su valor comparable
 * del item — necesario para columnas anidadas/calculadas (p. ej. `cliente: (item) => item.cliente?.nombre`)
 * que no son un campo escalar directo.
 */
export function useOrdenamiento<T>(datos: T[], accesores: AccesoresOrdenamiento<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<T>[]>(
    () =>
      Object.entries(accesores).map(([id, accessorFn]) => ({
        id,
        accessorFn,
        sortingFn: (rowA, rowB, columnId) =>
          compararValores(
            rowA.getValue<ValorOrdenable>(columnId),
            rowB.getValue<ValorOrdenable>(columnId),
          ),
      })),
    [accesores],
  )

  const table = useReactTable({
    data: datos,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const datosOrdenados = table.getSortedRowModel().rows.map((row) => row.original)
  const columnaActiva = sorting[0]?.id ?? null
  const direccion: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc'

  function ordenarPor(columna: string) {
    setSorting((actual) => {
      if (actual[0]?.id !== columna) return [{ id: columna, desc: false }]
      if (!actual[0].desc) return [{ id: columna, desc: true }]
      return []
    })
  }

  return { datosOrdenados, columnaActiva, direccion, ordenarPor }
}
