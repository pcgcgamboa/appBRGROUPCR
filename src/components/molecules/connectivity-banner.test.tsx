import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ConnectivityBanner } from './connectivity-banner'

function definirEnLinea(enLinea: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: enLinea,
  })
}

describe('ConnectivityBanner', () => {
  afterEach(() => {
    definirEnLinea(true)
  })

  it('no muestra nada cuando hay conexión', () => {
    definirEnLinea(true)
    const { container } = render(<ConnectivityBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el aviso de sin conexión cuando no hay conexión', () => {
    definirEnLinea(false)
    render(<ConnectivityBanner />)
    expect(
      screen.getByText('Sin conexión — los cambios se guardan localmente.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
