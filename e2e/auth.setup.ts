import { test as setup } from '@playwright/test'

const ARCHIVO_SESION = 'e2e/.auth/user.json'

// Requiere una cuenta de prueba real en el proyecto Supabase vinculado, con sus credenciales en
// las variables de entorno TEST_USER_ACCOUNT / TEST_USER_PASSWORD (el campo de login acepta la
// "Cuenta" configurada para el usuario, no necesariamente un correo). En CI llegan como secretos
// del repositorio (ver .github/workflows/ci.yml, job `e2e-autenticado`) — sin ellos, este setup
// falla con un mensaje claro en vez de correr con credenciales vacías.
setup('iniciar sesión y guardar el estado', async ({ page }) => {
  const cuenta = process.env.TEST_USER_ACCOUNT
  const password = process.env.TEST_USER_PASSWORD
  if (!cuenta || !password) {
    throw new Error(
      'Faltan TEST_USER_ACCOUNT / TEST_USER_PASSWORD — requeridas para la suite autenticada (npm run test:e2e:auth).',
    )
  }

  await page.goto('/login')
  await page.getByLabel('Cuenta').fill(cuenta)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: /iniciar sesión|ingresar|entrar/i }).click()
  await page.waitForURL(/\/(administrador|encargado|solicitante|operador|cliente)\//)

  await page.context().storageState({ path: ARCHIVO_SESION })
})
