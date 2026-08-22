import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MetricCard({
  label,
  value,
  icon: Icon,
  alert = false,
  onClick,
}: {
  label: string
  value: number
  icon: LucideIcon
  alert?: boolean
  onClick?: () => void
}) {
  const className = cn(
    'w-full rounded-lg border p-5 text-left shadow-sm',
    alert && value > 0 ? 'border-destructive/30 bg-destructive-soft' : 'bg-card',
    onClick &&
      'group cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  )
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <Icon className={alert && value > 0 ? 'size-5 text-destructive' : 'size-5 text-primary'} />
          {onClick && (
            <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
          )}
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      {onClick && <p className="mt-2 text-xs text-muted-foreground">Ver solicitudes</p>}
    </>
  )

  if (onClick)
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={`${label}: ${value}. Ver solicitudes`}
      >
        {content}
      </button>
    )

  return <article className={className}>{content}</article>
}
