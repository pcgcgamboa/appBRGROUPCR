import { expect, test } from '@playwright/test'

// Estos specs no dependen de credenciales reales de Supabase: deben pasar tanto
// en CI (sin .env.local, por lo tanto supabaseConfigurado === false) como en un
// entorno local con .env.local presente (supabaseConfigurado === true). Ver
// src/components/pages/home-page.tsx: sin sesión, si Supabase está configurado
// se muestra <LoginPage/> (encabezado "Bienvenido de nuevo"); si no, se muestra
// el aviso para copiar .env.example.

test.describe('rutas públicas', () => {
  test('la raíz muestra el login o el aviso de configuración de Supabase', async ({ page }) => {
    await page.goto('/')

    const tituloLogin = page.getByRole('heading', { name: 'Bienvenido de nuevo' })
    const avisoConfiguracion = page.getByText('.env.local', { exact: false })

    await expect(tituloLogin.or(avisoConfiguracion)).toBeVisible()
  })

  test('/bolsa-empleo muestra el formulario de postulación de técnicos', async ({ page }) => {
    await page.goto('/bolsa-empleo')

    await expect(
      page.getByRole('heading', { name: 'Únase a nuestra red de técnicos' }),
    ).toBeVisible()
    await expect(page.getByText('Nombre completo')).toBeVisible()
    // getByLabel('Identificación') es ambiguo: además del campo de texto, el adjunto de
    // documento "Cédula" describe su propósito como "...ambos lados de la identificación",
    // y por defecto el matcher de Playwright hace substring case-insensitive — se acota al
    // campo de texto explícitamente para no depender del texto descriptivo del adjunto.
    await expect(page.getByRole('textbox', { name: 'Identificación' })).toBeVisible()
  })
})
