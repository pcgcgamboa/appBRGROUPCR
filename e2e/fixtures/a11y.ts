import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/**
 * Corre un escaneo de accesibilidad (axe-core) sobre la página actual y falla el test si hay
 * violaciones. Reutilizable en specs públicos y autenticados — mapea directo a la categoría
 * "Accessibility (CRITICAL)" que ya usa este proyecto como referencia de diseño (contraste,
 * aria-label, orden de foco, etc.).
 */
export async function expectNoAccessibilityViolations(page: Page) {
  // axe-core mide contraste de color sobre un frame renderizado; en elementos con
  // `transition-all`/`hover:-translate-y-*` (los botones primarios de este proyecto, ver
  // src/components/atoms/button.tsx) a veces cae justo en medio de una transición y reporta un
  // color mezclado que no corresponde a ningún estado real — falso positivo conocido de axe con
  // transiciones CSS. Se desactivan antes de escanear para medir el color final real.
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  })
  const resultados = await new AxeBuilder({ page }).analyze()
  expect(resultados.violations, formatearViolaciones(resultados.violations)).toEqual([])
}

function formatearViolaciones(violaciones: { id: string; help: string; nodes: unknown[] }[]) {
  if (!violaciones.length) return ''
  return violaciones.map((v) => `- [${v.id}] ${v.help} (${v.nodes.length} elemento(s))`).join('\n')
}
