import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Apartado dentro de un panel de gestión: tarjeta con encabezado propio (ícono, título,
 * descripción y un complemento opcional a la derecha, p. ej. el estado) para separar visualmente
 * bloques de contenido distintos dentro del mismo panel.
 */
export function PanelSection({
  id,
  icon: Icon,
  title,
  description,
  aside,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  description?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b bg-muted/50 px-4 py-3 sm:px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={id} className="font-semibold">
            {title}
          </h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  )
}
