import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type WorkspacePanelProps = {
  title: string
  description?: string
  icon: LucideIcon
  actions?: ReactNode
  children: ReactNode
  className?: string
  variant: 'management' | 'list'
}

export function WorkspacePanel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  variant,
}: WorkspacePanelProps) {
  const management = variant === 'management'

  return (
    <section
      className={cn(
        'space-y-5 rounded-2xl p-4 sm:p-6',
        management ? 'border-2 border-primary/30 bg-primary/5 shadow-sm' : 'border bg-muted/20',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 border-b pb-4',
          management ? 'border-primary/20' : 'border-border',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg shadow-sm',
              management ? 'bg-primary text-primary-foreground' : 'bg-card text-primary',
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}
