import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHookConProviders } from '@/test/render-with-providers'
import type { MiSolicitud } from '@/features/solicitudes/types/solicitudes.types'
import { useMisSolicitudes } from './use-mis-solicitudes'

const misSolicitudes = vi.fn()

// Convención (ver src/test/render-with-providers.tsx): sustituye el singleton del repositorio,
// no el hook — así se prueba el hook real, no un doble de él.
vi.mock('@/features/solicitudes/lib/repository', () => ({
  solicitudRepository: { misSolicitudes: (...args: unknown[]) => misSolicitudes(...args) },
}))

const solicitudEjemplo: MiSolicitud = {
  id: 's1',
  numero: 12,
  nombre: 'Mantenimiento de aire acondicionado',
  detalle: 'El equipo no enfría desde ayer.',
  tipo_solicitud_id: 't1',
  ubicacion_id: 'u1',
  equipo_id: null,
  estado: 'asignada',
  prioridad: 'alta',
  creado_en: '2026-09-01T10:00:00Z',
  sla_vence_en: null,
  tipo: { nombre: 'Mantenimiento' },
  archivo: [],
}

describe('useMisSolicitudes', () => {
  afterEach(() => {
    misSolicitudes.mockReset()
  })

  it('no consulta cuando no hay usuarioId', () => {
    const { result } = renderHookConProviders(() => useMisSolicitudes(undefined))
    expect(result.current.fetchStatus).toBe('idle')
    expect(misSolicitudes).not.toHaveBeenCalled()
  })

  it('devuelve las solicitudes del usuario en éxito', async () => {
    misSolicitudes.mockResolvedValueOnce([solicitudEjemplo])
    const { result } = renderHookConProviders(() => useMisSolicitudes('u1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([solicitudEjemplo])
    expect(misSolicitudes).toHaveBeenCalledWith('u1')
  })

  it('expone el error cuando el repositorio rechaza', async () => {
    misSolicitudes.mockRejectedValueOnce(new Error('sin conexión'))
    const { result } = renderHookConProviders(() => useMisSolicitudes('u1'))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error('sin conexión'))
  })
})
