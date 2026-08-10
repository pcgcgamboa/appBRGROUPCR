import type { LucideIcon } from 'lucide-react'

interface StatusCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function StatusCard({ icon: Icon, title, description }: StatusCardProps) {
  return (
    <article className="rounded-lg border bg-white p-5 shadow-sm">
      <Icon className="mb-4 size-6 text-primary" aria-hidden="true" />
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  )
}
