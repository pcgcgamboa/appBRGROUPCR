import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        '-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-11 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-semibold text-muted-foreground transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 focus-visible:outline-none', className)}
      {...props}
    />
  )
}
