import { defineConfig } from '@playwright/test'

// Tres projects, dos suites independientes:
// - `chromium`: la suite pública de siempre (sin credenciales) — la única que corre en el job de
//   CI obligatorio, vía `npm run test:e2e`.
// - `setup` + `autenticado`: flujos que requieren sesión real contra el proyecto Supabase
//   vinculado. Corren aparte vía `npm run test:e2e:auth`, en un job de CI separado y no
//   bloqueante (ver .github/workflows/ci.yml) — nunca se ejecutan como parte del job obligatorio.
//   `setup` hace login una vez y guarda la sesión en `e2e/.auth/user.json` (gitignored: contiene
//   un token real); `autenticado` la reutiliza vía `storageState` en vez de loguearse en cada test.
export default defineConfig({
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      testDir: './e2e',
      testIgnore: ['**/auth/**', '**/auth.setup.ts', '**/visual/**'],
    },
    {
      name: 'visual',
      testDir: './e2e/visual',
    },
    {
      name: 'setup',
      testDir: './e2e',
      testMatch: 'auth.setup.ts',
    },
    {
      name: 'autenticado',
      testDir: './e2e/auth',
      dependencies: ['setup'],
      use: { storageState: 'e2e/.auth/user.json' },
    },
  ],
})
