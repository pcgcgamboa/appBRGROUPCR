import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function Checkbox({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded border border-input bg-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
