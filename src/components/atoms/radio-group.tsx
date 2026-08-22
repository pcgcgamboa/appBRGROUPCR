import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function RadioGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('grid gap-2', className)} {...props} />
}

export function RadioGroupItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full border border-input bg-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 data-[state=checked]:border-primary',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
    </RadioGroupPrimitive.Item>
  )
}
