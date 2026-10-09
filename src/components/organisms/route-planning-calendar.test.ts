import { describe, expect, it } from 'vitest'
import { diasDelMes, fechaId, inicioDeSemana } from './route-planning-calendar'

describe('fechaId', () => {
  it('formatea con ceros a la izquierda en mes y día', () => {
    expect(fechaId(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(fechaId(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('inicioDeSemana', () => {
  // Ancla real verificada en esta sesión: 28 de septiembre de 2026 es lunes
  // (ver captura del calendario de Programación, columna "Lun" muestra el 28).
  it('un lunes se devuelve a sí mismo', () => {
    expect(fechaId(inicioDeSemana(new Date(2026, 8, 28)))).toBe('2026-09-28')
  })

  it('un día a mitad de semana retrocede al lunes de esa semana', () => {
    expect(fechaId(inicioDeSemana(new Date(2026, 8, 30)))).toBe('2026-09-28')
  })

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(fechaId(inicioDeSemana(new Date(2026, 9, 4)))).toBe('2026-09-28')
  })
})

describe('diasDelMes', () => {
  it('genera 42 días consecutivos empezando en el lunes de la semana del día 1', () => {
    const dias = diasDelMes(new Date(2026, 8, 15))
    expect(dias).toHaveLength(42)
    // Setiembre de 2026 empieza en martes (derivado del ancla de arriba: 28 es lunes,
    // 7, 14, 21 y 28 también son lunes, así que el 1 cae martes) — el lunes de esa
    // semana es el 31 de agosto.
    expect(fechaId(dias[0])).toBe('2026-08-31')
    for (let i = 1; i < dias.length; i++) {
      expect(dias[i].getTime() - dias[i - 1].getTime()).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('el primer día de la grilla siempre coincide con inicioDeSemana del día 1 del mes', () => {
    const fecha = new Date(2027, 2, 10)
    const dias = diasDelMes(fecha)
    expect(fechaId(dias[0])).toBe(fechaId(inicioDeSemana(new Date(2027, 2, 1))))
  })
})
