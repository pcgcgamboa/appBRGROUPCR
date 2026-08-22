import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}
