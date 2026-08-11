import type { LucideIcon } from 'lucide-react'

export function MetricCard({
  label,
  value,
  icon: Icon,
  alert = false,
}: {
  label: string
  value: number
  icon: LucideIcon
  alert?: boolean
}) {
  return (
    <article
      className={
        alert && value > 0
          ? 'rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm'
          : 'rounded-lg border bg-white p-5 shadow-sm'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className={alert && value > 0 ? 'size-5 text-red-700' : 'size-5 text-primary'} />
      </div>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </article>
  )
}
