import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
      {...props}
    />
  ),
)

Select.displayName = 'Select'
