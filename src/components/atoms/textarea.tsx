import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:bg-muted disabled:opacity-60',
      className,
    )}
    {...props}
  />
))

Textarea.displayName = 'Textarea'
