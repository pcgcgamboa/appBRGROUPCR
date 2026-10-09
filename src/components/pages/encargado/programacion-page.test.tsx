import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderConProviders } from '@/test/render-with-providers'
import { ProgramacionPage } from './programacion-page'

const rutasProceso = vi.fn()
const solicitudesProgramadas = vi.fn()
const solicitudesParaRuta = vi.fn()

vi.mock('@/features/flota/lib/repository', () => ({
  flotaRepository: {
    rutasProceso: (...args: unknown[]) => rutasProceso(...args),
    solicitudesProgramadas: (...args: unknown[]) => solicitudesProgramadas(...args),
  },
}))
vi.mock('@/features/rutas/lib/repository', () => ({
  rutasRepository: { solicitudesParaRuta: (...args: unknown[]) => solicitudesParaRuta(...args) },
}))

afterEach(() => {
  rutasProceso.mockReset()
  solicitudesProgramadas.mockReset()
  solicitudesParaRuta.mockReset()
})

function prepararVacio() {
  rutasProceso.mockResolvedValue([])
  solicitudesProgramadas.mockResolvedValue([])
  solicitudesParaRuta.mockResolvedValue([])
}

describe('ProgramacionPage — toggle Calendario/Listado (usabilidad: un solo lugar para ambos)', () => {
  it('muestra un Skeleton mientras carga, antes de resolver los datos', () => {
    rutasProceso.mockReturnValue(new Promise(() => {})) // nunca resuelve durante el test
    solicitudesProgramadas.mockReturnValue(new Promise(() => {}))
    solicitudesParaRuta.mockResolvedValue([])
    const { container } = renderConProviders(<ProgramacionPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('vista Calendario muestra el estado vacío del calendario cuando no hay trabajo', async () => {
    prepararVacio()
    renderConProviders(<ProgramacionPage />)
    await waitFor(() => expect(screen.getByText('No hay trabajo planificado')).toBeInTheDocument())
  })

  it('alternar a Rutas cambia el contenido visible al listado de tarjetas', async () => {
    prepararVacio()
    const user = userEvent.setup()
    renderConProviders(<ProgramacionPage />)
    await waitFor(() => expect(screen.getByText('No hay trabajo planificado')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^Rutas$/i }))

    expect(screen.getByText('No hay rutas agrupadas.')).toBeInTheDocument()
    expect(screen.queryByText('No hay trabajo planificado')).not.toBeInTheDocument()
    // El buscador del listado solo existe en esta vista.
    expect(screen.getByPlaceholderText('Buscar por ruta o responsable…')).toBeInTheDocument()
  })
})
