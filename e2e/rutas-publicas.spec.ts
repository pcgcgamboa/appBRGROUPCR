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
    await expect(page.getByLabel('Identificación')).toBeVisible()
  })
})
