import type { LucideIcon } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'

/**
 * Marco del panel que se despliega bajo una fila de tabla (Modificar, Ver detalle, Mensajes).
 * Lo distingue del resto del contenido con el lenguaje de "panel de gestión" del sistema
 * (borde primary + fondo primary-soft, ver WorkspacePanel), una punta que lo une a su fila y una
 * franja que indica qué se está haciendo. Las tarjetas internas (bg-card) contrastan sobre él.
 */
export function ExpandedRowPanel({
  icon: Icon,
  etiqueta,
  descripcion,
  panelRef,
  children,
}: {
  icon: LucideIcon
  etiqueta: string
  descripcion?: string
  /** Para desplazar la vista al panel cuando se abre (ver useDesplazarAlMostrar). */
  panelRef?: RefObject<HTMLDivElement>
  children: ReactNode
}) {
  return (
    <div
      ref={panelRef}
      className="relative mt-2 scroll-mt-24 rounded-2xl border-2 border-primary/40 bg-primary-soft/70 p-3 shadow-md before:absolute before:-top-[9px] before:left-10 before:size-4 before:rotate-45 before:border-l-2 before:border-t-2 before:border-primary/40 before:bg-primary-soft before:content-[''] sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-primary-soft-foreground">
          {etiqueta}
        </span>
        {descripcion && (
          <span className="text-xs text-primary-soft-foreground/80">· {descripcion}</span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
