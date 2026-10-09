import { expect, test } from '@playwright/test'

// Regresión visual del login en los 3 anchos de referencia de DESIGN.md. Vive en un project
// aparte (`visual`, ver playwright.config.ts) que corre en el job de CI no bloqueante junto a la
// suite autenticada — un diff de renderizado (fuente, antialiasing) no debe poder tumbar un PR no
// relacionado con esta pantalla.
//
// Importante: las imágenes base (`*-snapshots/`) deben generarse una sola vez desde el runner de
// CI (ubuntu-latest + chromium, igual que .github/workflows/ci.yml), nunca desde Windows/macOS
// local — el subpixel-rendering de fuentes difiere entre SO y produciría un diff permanente. Ver
// el job `e2e-visual-baseline` (workflow_dispatch) para generarlas/regenerarlas.
const anchos = [
  { nombre: 'movil', width: 390, height: 844 },
  { nombre: 'tablet', width: 768, height: 1024 },
  { nombre: 'escritorio', width: 1440, height: 900 },
]

test.describe('Login — regresión visual', () => {
  for (const { nombre, width, height } of anchos) {
    test(`se ve igual en ${nombre} (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/login')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveScreenshot(`login-${nombre}.png`, { fullPage: true })
    })
  }
})
