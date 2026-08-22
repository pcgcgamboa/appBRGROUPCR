import { describe, expect, it } from 'vitest'
import { TAMANO_MAXIMO_BYTES, validarArchivo } from './adjuntos'

function crearArchivo(nombre: string, tipo: string, tamano: number) {
  return new File([new Uint8Array(tamano)], nombre, { type: tipo })
}

describe('validarArchivo', () => {
  it('acepta un archivo válido dentro del límite de tamaño', () => {
    const archivo = crearArchivo('foto.jpg', 'image/jpeg', 1024)
    expect(validarArchivo(archivo)).toBeNull()
  })

  it('rechaza un archivo que supera el límite de 10 MB', () => {
    const archivo = crearArchivo('foto-grande.png', 'image/png', TAMANO_MAXIMO_BYTES + 1)
    expect(validarArchivo(archivo)).toBe('Supera el límite de 10 MB.')
  })

  it('rechaza un tipo MIME no permitido', () => {
    const archivo = crearArchivo('documento.exe', 'application/x-msdownload', 1024)
    expect(validarArchivo(archivo)).toBe('Tipo de archivo no permitido.')
  })
})
