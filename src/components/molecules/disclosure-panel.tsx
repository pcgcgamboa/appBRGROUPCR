import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function DisclosurePanel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <details className="group rounded-xl border bg-card shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  )
}
