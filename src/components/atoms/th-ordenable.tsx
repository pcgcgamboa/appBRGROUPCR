import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Reemplazo drop-in de un `<th>` de texto plano para hacerlo ordenable — conserva el `className`
 * que ya traía cada tabla (los dos estilos de encabezado que conviven en el sistema:
 * `bg-muted`/`px-4 py-3` y el estilo "bare" con solo `py-2`), y agrega el botón + ícono de orden
 * adentro. `columna` debe coincidir con la clave usada en el `accesores` pasado a
 * `useOrdenamiento` (ver `src/hooks/use-ordenamiento.ts`).
 */
export function ThOrdenable({
  columna,
  ordenActual,
  direccion,
  onOrdenar,
  className,
  children,
}: {
  columna: string
  ordenActual: string | null
  direccion: 'asc' | 'desc'
  onOrdenar: (columna: string) => void
  className?: string
  children: ReactNode
}) {
  const activa = ordenActual === columna
  const Icono = activa ? (direccion === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th
      className={className}
      aria-sort={activa ? (direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onOrdenar(columna)}
        className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        <Icono
          className={cn(
            'size-3.5 shrink-0',
            activa ? 'text-foreground' : 'text-muted-foreground/50',
          )}
          aria-hidden="true"
        />
      </button>
    </th>
  )
}
