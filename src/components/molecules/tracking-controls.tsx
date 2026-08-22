import { Input } from '@/components/atoms/input'
import { Select } from '@/components/atoms/select'

export function TrackingControls({
  search,
  onSearchChange,
  type,
  onTypeChange,
  types,
  order,
  onOrderChange,
}: {
  search: string
  onSearchChange: (value: string) => void
  type: string
  onTypeChange: (value: string) => void
  types: string[]
  order: 'desc' | 'asc'
  onOrderChange: (value: 'desc' | 'asc') => void
}) {
  return (
    <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[minmax(180px,1fr)_180px_180px]">
      <Input
        type="search"
        placeholder="Buscar en el tracking…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Select value={type} onChange={(event) => onTypeChange(event.target.value)}>
        <option value="todos">Todos los tipos</option>
        {types.map((item) => (
          <option key={item} value={item}>
            {item.replace(/_/g, ' ')}
          </option>
        ))}
      </Select>
      <Select
        value={order}
        onChange={(event) => onOrderChange(event.target.value as 'desc' | 'asc')}
      >
        <option value="desc">Más recientes primero</option>
        <option value="asc">Más antiguos primero</option>
      </Select>
    </div>
  )
}
