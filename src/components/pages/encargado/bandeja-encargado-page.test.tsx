import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderConProviders } from '@/test/render-with-providers'
import { BandejaEncargadoPage } from './bandeja-encargado-page'

const listarAdmin = vi.fn()
const operadoresActivos = vi.fn()

vi.mock('@/features/auth/hooks/use-session', () => ({
  useSession: () => ({ session: { user: { id: 'u1' } }, cargando: false }),
}))
vi.mock('@/features/solicitudes/lib/repository', () => ({
  solicitudRepository: {
    listarAdmin: (...args: unknown[]) => listarAdmin(...args),
    operadoresActivos: (...args: unknown[]) => operadoresActivos(...args),
  },
}))

afterEach(() => {
  listarAdmin.mockReset()
  operadoresActivos.mockReset()
})

describe('BandejaEncargadoPage — estados de usabilidad (DESIGN.md: loading/empty/error)', () => {
  it('muestra el estado vacío cuando no hay solicitudes, sin romper el filtro/orden', async () => {
    listarAdmin.mockResolvedValueOnce([])
    operadoresActivos.mockResolvedValueOnce([])
    renderConProviders(<BandejaEncargadoPage />)

    await waitFor(() => expect(screen.getByText('No hay solicitudes.')).toBeInTheDocument())
    // El buscador y el filtro de estado siguen operables aunque no haya filas.
    expect(
      screen.getByPlaceholderText('Buscar solicitud, Cliente, solicitante u operador…'),
    ).toBeEnabled()
  })

  it('muestra el error visible con role="alert" cuando el repositorio rechaza', async () => {
    listarAdmin.mockRejectedValueOnce(new Error('Sin conexión con el servidor'))
    operadoresActivos.mockResolvedValueOnce([])
    renderConProviders(<BandejaEncargadoPage />)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Sin conexión con el servidor')
  })
})
