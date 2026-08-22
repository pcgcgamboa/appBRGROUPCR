import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:bg-muted disabled:opacity-60',
        className,
      )}
      {...props}
    />
  ),
)

Select.displayName = 'Select'
