import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderConProviders } from '@/test/render-with-providers'
import type { ResponsableRuta } from '@/features/flota/types/flota.types'
import type { SolicitudParaRuta } from '@/features/rutas/types/rutas.types'
import { ProcessRouteForm } from './process-route-form'

const responsablesRuta = vi.fn()
const guardarRutaProceso = vi.fn()
const solicitudesParaRuta = vi.fn()
const listarCatalogo = vi.fn()

vi.mock('@/features/flota/lib/repository', () => ({
  flotaRepository: {
    responsablesRuta: (...args: unknown[]) => responsablesRuta(...args),
    guardarRutaProceso: (...args: unknown[]) => guardarRutaProceso(...args),
  },
}))
vi.mock('@/features/rutas/lib/repository', () => ({
  rutasRepository: { solicitudesParaRuta: (...args: unknown[]) => solicitudesParaRuta(...args) },
}))
vi.mock('@/features/catalogos/lib/repository', () => ({
  catalogoRepository: { listar: (...args: unknown[]) => listarCatalogo(...args) },
}))

const responsable: ResponsableRuta = {
  id: 'u1',
  nombre_completo: 'Ericka Bolaños',
  usuario_roles: [{ rol: { codigo: 'encargado' } }],
}
const solicitud: SolicitudParaRuta = {
  id: 'sol-1',
  numero: 12,
  nombre: 'Instalación de cámara',
  estado: 'asignada',
  operador_id: null,
  cliente: { nombre: 'Cliente demo' },
  ubicacion: { provincia: 'San José' },
} as SolicitudParaRuta

function prepararDatos() {
  responsablesRuta.mockResolvedValue([responsable])
  solicitudesParaRuta.mockResolvedValue([solicitud])
  listarCatalogo.mockResolvedValue([]) // sin vehículos disponibles en el catálogo
}

afterEach(() => {
  responsablesRuta.mockReset()
  guardarRutaProceso.mockReset()
  solicitudesParaRuta.mockReset()
  listarCatalogo.mockReset()
})

describe('ProcessRouteForm — Nombre y Vehículos opcionales (regresión)', () => {
  it('habilita "Guardar ruta" sin Nombre y sin ningún vehículo, con responsable/solicitud/participante', async () => {
    prepararDatos()
    const user = userEvent.setup()
    renderConProviders(<ProcessRouteForm onClose={() => {}} />)

    await screen.findByRole('checkbox', { name: /Instalación de cámara/i })

    // Nombre se deja en blanco a propósito.
    expect(screen.getByLabelText(/^Nombre/i)).toHaveValue('')

    await user.selectOptions(screen.getByLabelText(/Operario responsable/i), 'u1')
    await user.click(screen.getByRole('checkbox', { name: /Instalación de cámara/i }))

    const boton = screen.getByRole('button', { name: /Guardar ruta/i })
    await waitFor(() => expect(boton).toBeEnabled())

    await user.click(boton)
    await waitFor(() => expect(guardarRutaProceso).toHaveBeenCalledTimes(1))
    const enviado = guardarRutaProceso.mock.calls[0][0]
    expect(enviado.nombre).toBe('')
    expect(enviado.vehiculos).toEqual([])
  })

  it('mantiene deshabilitado "Guardar ruta" sin responsable ni solicitud seleccionados', async () => {
    prepararDatos()
    renderConProviders(<ProcessRouteForm onClose={() => {}} />)

    await screen.findByRole('checkbox', { name: /Instalación de cámara/i })
    expect(screen.getByRole('button', { name: /Guardar ruta/i })).toBeDisabled()
  })
})
