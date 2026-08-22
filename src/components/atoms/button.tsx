import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        outline: 'border bg-card shadow-sm hover:border-primary/30 hover:bg-accent',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3',
        default: 'min-h-11 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Component = asChild ? Slot : 'button'
    return (
      <Component ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
  },
)
Button.displayName = 'Button'
