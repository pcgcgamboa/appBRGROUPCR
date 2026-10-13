import { X } from 'lucide-react'
import { Button } from '@/components/atoms/button'
import { cn } from '@/lib/utils'

/**
 * Botón estándar para cerrar un panel inline: una X en la esquina superior derecha del panel
 * (los Dialog/Sheet ya traen la suya). Objetivo táctil de 44 px.
 */
export function PanelCloseButton({
  onClose,
  label = 'Cerrar panel',
  className,
}: {
  onClose: () => void
  label?: string
  className?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-11 shrink-0 text-muted-foreground', className)}
      onClick={onClose}
      aria-label={label}
      title={label}
    >
      <X className="size-5" />
    </Button>
  )
}
