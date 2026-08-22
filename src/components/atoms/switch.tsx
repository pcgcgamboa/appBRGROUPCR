import * as SwitchPrimitive from '@radix-ui/react-switch'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function Switch({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-card shadow-sm transition-transform data-[state=checked]:translate-x-[1.375rem]" />
    </SwitchPrimitive.Root>
  )
}
