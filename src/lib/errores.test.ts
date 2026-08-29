import { describe, expect, it } from 'vitest'
import { normalizarError } from '@/lib/errores'

describe('normalizarError', () => {
  it('extrae el mensaje de un Error estándar', () => {
    expect(normalizarError(new Error('Falló la operación'), 'es')).toEqual({
      mensaje: 'Falló la operación',
    })
  })

  it('traduce un mensaje conocido de un Error usando traducirError', () => {
    expect(
      normalizarError(new Error('A user with this email address has already been registered'), 'es')
        .mensaje,
    ).toBe('Ya existe un usuario registrado con esta cuenta.')
  })

  it('extrae message y code de un objeto con forma de PostgrestError', () => {
    expect(normalizarError({ message: 'Violación de restricción', code: '23505' }, 'es')).toEqual({
      mensaje: 'Violación de restricción',
      codigo: '23505',
    })
  })

  it('retorna el mensaje genérico de respaldo para formas no reconocibles', () => {
    expect(normalizarError('cualquier cosa', 'es')).toEqual({
      mensaje: 'Ocurrió un error inesperado. Intente nuevamente.',
    })
    expect(normalizarError(null, 'en').mensaje).toBe(
      'An unexpected error occurred. Please try again.',
    )
  })
})
