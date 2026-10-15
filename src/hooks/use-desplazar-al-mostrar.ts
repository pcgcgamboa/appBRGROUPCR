import { type RefObject, useEffect } from 'react'

/**
 * Cuando se muestra un panel que se expande hacia abajo, desplaza la vista para que quede al inicio
 * de la pantalla. `clave` identifica lo que está abierto (true/false, o un id si el mismo panel
 * puede pasar de una solicitud a otra): se desplaza cada vez que cambia a un valor no vacío.
 * Respeta `prefers-reduced-motion`; el elemento debería tener `scroll-mt-*` para no quedar bajo la
 * barra superior.
 */
export function useDesplazarAlMostrar(
  clave: string | boolean | null | undefined,
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!clave) return
    // Espera al siguiente cuadro: el panel recién montado ya tiene su tamaño definitivo.
    const cuadro = requestAnimationFrame(() => {
      const reducirMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ref.current?.scrollIntoView({
        behavior: reducirMovimiento ? 'auto' : 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(cuadro)
  }, [clave, ref])
}
