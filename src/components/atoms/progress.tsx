import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Progress({
  value,
  max = 100,
  className,
  ...props
}: { value: number; max?: number } & Omit<HTMLAttributes<HTMLDivElement>, 'children'>) {
  const porcentaje = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  )
}
