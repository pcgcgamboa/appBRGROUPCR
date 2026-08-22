import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-muted text-muted-foreground',
      primary: 'bg-primary-soft text-primary-soft-foreground',
      success: 'bg-success-soft text-success-soft-foreground',
      warning: 'bg-warning-soft text-warning-soft-foreground',
      destructive: 'bg-destructive-soft text-destructive-soft-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
