import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHookConProviders } from '@/test/render-with-providers'
import type { RutaProceso, RutaProcesoInput } from '@/features/flota/types/flota.types'
import { useGuardarRutaProceso, useProgramarSolicitud, useRutasProceso } from './use-flota'

const rutasProceso = vi.fn()
const guardarRutaProceso = vi.fn()
const programarSolicitud = vi.fn()

vi.mock('@/features/flota/lib/repository', () => ({
  flotaRepository: {
    rutasProceso: (...args: unknown[]) => rutasProceso(...args),
    guardarRutaProceso: (...args: unknown[]) => guardarRutaProceso(...args),
    programarSolicitud: (...args: unknown[]) => programarSolicitud(...args),
  },
}))

const rutaEjemplo: RutaProceso = {
  id: 'r1',
  codigo: 'RUTA-001',
  nombre: 'RUTA-001',
  descripcion: null,
  fecha_programada: '2026-09-28',
  estado: 'planificada',
  responsable_id: 'u1',
  responsable: { nombre_completo: 'Ericka Bolaños' },
  ruta_solicitudes: [],
  // Regresión directa del cambio reciente: una ruta sin vehículo es un estado válido.
  ruta_vehiculos: [],
  ruta_participantes: [],
}

afterEach(() => {
  rutasProceso.mockReset()
  guardarRutaProceso.mockReset()
  programarSolicitud.mockReset()
})

describe('useRutasProceso', () => {
  it('devuelve las rutas en éxito, incluida una sin vehículo asignado', async () => {
    rutasProceso.mockResolvedValueOnce([rutaEjemplo])
    const { result } = renderHookConProviders(() => useRutasProceso())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].ruta_vehiculos).toEqual([])
  })

  it('expone el error cuando el repositorio rechaza', async () => {
    rutasProceso.mockRejectedValueOnce(new Error('falló la red'))
    const { result } = renderHookConProviders(() => useRutasProceso())
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useGuardarRutaProceso', () => {
  const inputSinNombreNiVehiculo: RutaProcesoInput = {
    codigo: 'RUTA-002',
    nombre: '',
    descripcion: '',
    fecha: '2026-09-29',
    estado: 'planificada',
    responsable_id: 'u1',
    solicitudes: ['s1'],
    vehiculos: [],
    participantes: [{ usuario_id: 'u1', viatico: 0, detalle_viatico: '' }],
  }

  it('acepta nombre vacío y sin vehículos (ambos opcionales) y delega al repositorio tal cual', async () => {
    guardarRutaProceso.mockResolvedValueOnce('r2')
    const { result } = renderHookConProviders(() => useGuardarRutaProceso())
    result.current.mutate(inputSinNombreNiVehiculo)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(guardarRutaProceso).toHaveBeenCalledWith(inputSinNombreNiVehiculo)
  })
})

describe('useProgramarSolicitud', () => {
  it('llama al repositorio con la solicitud y la fecha', async () => {
    programarSolicitud.mockResolvedValueOnce(undefined)
    const { result } = renderHookConProviders(() => useProgramarSolicitud())
    result.current.mutate({ solicitudId: 's1', fecha: '2026-09-30' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(programarSolicitud).toHaveBeenCalledWith('s1', '2026-09-30')
  })
})
