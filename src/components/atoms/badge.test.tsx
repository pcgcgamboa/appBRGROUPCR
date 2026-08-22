import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './badge'

describe('Badge', () => {
  it('renderiza el texto hijo', () => {
    render(<Badge>Pendiente</Badge>)
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('aplica las clases de la variante default cuando no se especifica variante', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-muted', 'text-muted-foreground')
  })

  it('aplica las clases de la variante success', () => {
    render(<Badge variant="success">Completado</Badge>)
    expect(screen.getByText('Completado')).toHaveClass(
      'bg-success-soft',
      'text-success-soft-foreground',
    )
  })

  it('aplica las clases de la variante destructive', () => {
    render(<Badge variant="destructive">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass(
      'bg-destructive-soft',
      'text-destructive-soft-foreground',
    )
  })

  it('combina className adicional con las clases de variante', () => {
    render(
      <Badge variant="primary" className="ml-2">
        Activo
      </Badge>,
    )
    expect(screen.getByText('Activo')).toHaveClass('bg-primary-soft', 'ml-2')
  })
})
