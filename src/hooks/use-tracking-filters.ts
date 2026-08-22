import { useEffect, useMemo, useState } from 'react'

export function useTrackingFilters<T>(
  items: T[],
  fields: {
    date: (item: T) => string
    type: (item: T) => string
    text: (item: T) => string
  },
) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('todos')
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const types = useMemo(
    () => Array.from(new Set(items.map(fields.type))).sort((a, b) => a.localeCompare(b, 'es')),
    [items, fields],
  )
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return items
      .filter(
        (item) =>
          (type === 'todos' || fields.type(item) === type) &&
          (!term || fields.text(item).toLocaleLowerCase('es').includes(term)),
      )
      .sort((a, b) => {
        const comparison = fields.date(a).localeCompare(fields.date(b))
        return order === 'asc' ? comparison : -comparison
      })
  }, [items, search, type, order, fields])
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => setPage(1), [search, type, order])

  return {
    search,
    setSearch,
    type,
    setType,
    order,
    setOrder,
    page: currentPage,
    setPage,
    pageSize,
    types,
    filtered,
    paginated,
  }
}
