import { describe, expect, it } from 'vitest'
import type { SolicitudParaRuta } from '@/features/rutas/types/rutas.types'
import type { SolicitudAdmin } from '@/features/solicitudes/types/solicitudes.types'
import {
  distanciaKm,
  recomendarOperadoresPorReglas,
  recomendarSolicitudesRutaPorReglas,
} from './reglas'

const zona = (canton: string, distrito: string, latitud: number | null = null, longitud = 0) => ({
  nombre: 'Sede',
  otras_senas: null,
  provincia: 'San José',
  canton,
  distrito,
  latitud,
  longitud: latitud == null ? null : longitud,
})

function solicitudAdmin(parcial: Partial<SolicitudAdmin>): SolicitudAdmin {
  return {
    id: 's',
    numero: 1,
    estado: 'enviada',
    operador_id: null,
    tipo_solicitud_id: 't1',
    ubicacion: zona('Central', 'Carmen'),
    ...parcial,
  } as SolicitudAdmin
}

describe('recomendarOperadoresPorReglas', () => {
  it('prefiere al operador sin carga y con experiencia en el mismo tipo', () => {
    const nueva = solicitudAdmin({ id: 'nueva' })
    const historial = [
      solicitudAdmin({ id: 'a1', operador_id: 'ana', estado: 'en_atencion' }),
      solicitudAdmin({ id: 'a2', operador_id: 'ana', estado: 'asignada' }),
      solicitudAdmin({ id: 'b1', operador_id: 'beto', estado: 'cerrada' }),
    ]
    const resultado = recomendarOperadoresPorReglas(nueva, historial, [
      { id: 'ana', nombre_completo: 'Ana' },
      { id: 'beto', nombre_completo: 'Beto' },
    ])
    expect(resultado[0].operador_id).toBe('beto')
    expect(resultado[0].motivo).toContain('sin trabajo activo')
    expect(resultado[0].motivo).toContain('del mismo tipo')
  })
})

describe('recomendarSolicitudesRutaPorReglas', () => {
  const base = (parcial: Partial<SolicitudParaRuta>) =>
    ({
      estado: 'asignada',
      prioridad: null,
      sla_vence_en: null,
      operador_id: null,
      ruta_proceso: null,
      ubicacion: zona('Central', 'Carmen'),
      ...parcial,
    }) as SolicitudParaRuta

  it('excluye las ya elegidas o en otra ruta y prioriza cercanía y personas de la ruta', () => {
    const candidatas = [
      base({ id: 'elegida', ubicacion: zona('Central', 'Carmen', 9.93, -84.08) }),
      base({ id: 'cerca', ubicacion: zona('Central', 'Carmen', 9.94, -84.08) }),
      base({ id: 'lejos', ubicacion: zona('Liberia', 'Liberia', 10.63, -85.44) }),
      base({ id: 'del-equipo', operador_id: 'op1', ubicacion: zona('Liberia', 'Liberia') }),
      base({ id: 'en-otra', ruta_proceso: { ruta_id: 'r9', ruta: null } }),
    ]
    const resultado = recomendarSolicitudesRutaPorReglas({
      candidatas,
      seleccionadas: ['elegida'],
      personas: ['op1'],
      fecha: '2026-10-30',
    }).map((item) => item.solicitud_id)
    expect(resultado).not.toContain('elegida')
    expect(resultado).not.toContain('en-otra')
    expect(resultado.indexOf('cerca')).toBeLessThan(resultado.indexOf('lejos'))
    expect(resultado.indexOf('del-equipo')).toBeLessThan(resultado.indexOf('lejos'))
  })
})

describe('recomendarSolicitudesRutaPorReglas — ruta de varios días', () => {
  const base = (parcial: Partial<SolicitudParaRuta>) =>
    ({
      estado: 'asignada',
      prioridad: null,
      sla_vence_en: null,
      operador_id: null,
      cliente_id: 'otro',
      programacion: null,
      ruta_proceso: null,
      ubicacion: zona('Liberia', 'Liberia'),
      ...parcial,
    }) as SolicitudParaRuta

  it('favorece mismo cliente, mismo operador y fechas dentro del rango; resta fuera de él', () => {
    const candidatas = [
      base({ id: 'elegida', numero: 7, cliente_id: 'acme', operador_id: 'op9' }),
      base({ id: 'mismo-cliente', cliente_id: 'acme' }),
      base({ id: 'mismo-operador', operador_id: 'op9' }),
      base({ id: 'dia-2', programacion: { fecha_programada: '2026-11-03' } }),
      base({ id: 'fuera', programacion: { fecha_programada: '2026-12-01' } }),
      base({ id: 'neutra' }),
    ]
    const resultado = recomendarSolicitudesRutaPorReglas({
      candidatas,
      seleccionadas: ['elegida'],
      personas: [],
      fecha: '2026-11-02',
      fechaFin: '2026-11-04',
    })
    const ids = resultado.map((item) => item.solicitud_id)
    const motivo = (id: string) => resultado.find((item) => item.solicitud_id === id)?.motivo
    expect(motivo('mismo-cliente')).toContain('mismo cliente que #7')
    expect(motivo('mismo-operador')).toContain('mismo operador')
    expect(motivo('dia-2')).toContain('programada para el 2026-11-03')
    expect(ids.indexOf('dia-2')).toBeLessThan(ids.indexOf('neutra'))
    expect(ids.indexOf('fuera')).toBeGreaterThan(ids.indexOf('neutra'))
  })
})

describe('distanciaKm', () => {
  it('devuelve null sin coordenadas y una distancia razonable con ellas', () => {
    expect(distanciaKm({ latitud: null, longitud: null }, { latitud: 1, longitud: 1 })).toBeNull()
    const km = distanciaKm(
      { latitud: 9.93, longitud: -84.08 },
      { latitud: 10.63, longitud: -85.44 },
    )
    expect(km).toBeGreaterThan(150)
    expect(km).toBeLessThan(180)
  })
})
