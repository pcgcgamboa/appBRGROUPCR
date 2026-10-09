import { Button } from '@/components/atoms/button'
import { Select } from '@/components/atoms/select'

export function GridPagination({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pages)
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1
  const end = Math.min(current * pageSize, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        Mostrando {start}–{end} de {total}
      </span>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <Select
            className="h-9 w-20"
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Registros por página"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </Select>
        )}
        <Button
          variant="outline"
          className="h-9"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          Anterior
        </Button>
        <span>
          Pág. {current} de {pages}
        </span>
        <Button
          variant="outline"
          className="h-9"
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
