export function leerBorrador<T>(clave: string): T | null {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as T) : null
  } catch {
    return null
  }
}

export function escribirBorrador<T>(clave: string, valor: T) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // Cuota excedida o almacenamiento no disponible (p. ej. navegación privada): se ignora,
    // el formulario sigue funcionando en memoria aunque no persista.
  }
}

export function borrarBorrador(clave: string) {
  try {
    localStorage.removeItem(clave)
  } catch {
    // Ver nota en escribirBorrador.
  }
}
