export const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

export const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024

export function validarArchivo(archivo: File): string | null {
  if (!TIPOS_PERMITIDOS.has(archivo.type)) return 'Tipo de archivo no permitido.'
  if (archivo.size > TAMANO_MAXIMO_BYTES) return 'Supera el límite de 10 MB.'
  return null
}

export function nombreSeguro(nombre: string) {
  return nombre.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_')
}
