import { expect, test } from '@playwright/test'
import { expectNoAccessibilityViolations } from '../fixtures/a11y'

// Deliberadamente sin flujos que escriban datos (crear/editar una ruta real) — esta suite corre
// automáticamente en cada push/PR (job no bloqueante, ver .github/workflows/ci.yml) contra el
// proyecto Supabase vinculado real; una prueba que inserta filas en cada corrida las acumularía
// sin limpieza. Cubre navegación, estados visibles y el toggle de vista, que no mutan datos.

async function irAAreaConProgramacion(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForURL(/\/(administrador|encargado|solicitante|operador|cliente)\//)
  const prefijoRol = new URL(page.url()).pathname.split('/')[1]
  test.skip(
    !['administrador', 'encargado'].includes(prefijoRol),
    'La cuenta de prueba no tiene rol administrador ni encargado (Programación solo existe en esas áreas).',
  )
  return prefijoRol
}

test.describe('Programación (autenticado)', () => {
  test('la sesión guardada por auth.setup.ts aterriza en un área protegida', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/\/(administrador|encargado|solicitante|operador|cliente)\//)
    expect(page.url()).not.toContain('/login')
  })

  test('la ruta antigua /rutas redirige a /programacion (fusión de secciones)', async ({
    page,
  }) => {
    const prefijoRol = await irAAreaConProgramacion(page)

    await page.goto(`/${prefijoRol}/rutas`)
    await page.waitForURL(`**/${prefijoRol}/programacion`)
    expect(page.url()).toContain(`/${prefijoRol}/programacion`)
  })

  test('el toggle Calendario/Listado cambia el contenido, sin recargar la página', async ({
    page,
  }) => {
    const prefijoRol = await irAAreaConProgramacion(page)

    await page.goto(`/${prefijoRol}/programacion`)
    await expect(page.getByRole('heading', { name: 'Programación' })).toBeVisible()

    await page.getByRole('button', { name: /^Calendario$/ }).click()
    await expect(page.getByRole('button', { name: /^Planificar$/ })).toBeVisible()
    await expectNoAccessibilityViolations(page)

    await page.getByRole('button', { name: /^Rutas$/ }).click()
    await expect(page.getByPlaceholder('Buscar por ruta o responsable…')).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })

  // Regresión visual — mismas advertencias que e2e/visual/login.spec.ts: las imágenes base se
  // generan una sola vez desde el runner de CI (ubuntu + chromium), nunca en local Windows/macOS.
  // Esta pantalla muestra datos reales y mutables (rutas creadas por el equipo) — se enmascara el
  // contenido dinámico (grilla de días con eventos, tarjetas de ruta) para comparar solo el chrome
  // estable (encabezado, toggle, filtros, buscador, layout responsivo); de lo contrario cualquier
  // ruta nueva creada por uso real del sistema volvería el baseline obsoleto.
  test('comparación visual de Calendario y Rutas en 3 anchos', async ({ page }) => {
    const prefijoRol = await irAAreaConProgramacion(page)
    await page.goto(`/${prefijoRol}/programacion`)

    const anchos = [
      { nombre: 'movil', width: 390, height: 844 },
      { nombre: 'tablet', width: 768, height: 1024 },
      { nombre: 'escritorio', width: 1440, height: 900 },
    ]

    for (const { nombre, width, height } of anchos) {
      await page.setViewportSize({ width, height })

      await page.getByRole('button', { name: /^Calendario$/ }).click()
      await expect(page.getByRole('button', { name: /^Planificar$/ })).toBeVisible()
      await expect(page).toHaveScreenshot(`programacion-calendario-${nombre}.png`, {
        mask: [
          page.locator('aside'),
          page.locator('.overflow-hidden.rounded-xl.border.bg-card > div:last-child'),
        ],
      })

      await page.getByRole('button', { name: /^Rutas$/ }).click()
      await expect(page.getByPlaceholder('Buscar por ruta o responsable…')).toBeVisible()
      await expect(page).toHaveScreenshot(`programacion-rutas-${nombre}.png`, {
        mask: [page.locator('.grid.gap-4.md\\:grid-cols-2')],
      })
    }
  })
})
