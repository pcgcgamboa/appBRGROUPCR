import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { AppProviders } from '@/app/providers'
import { registrarServiceWorker } from '@/lib/pwa'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/styles/globals.css'
import 'leaflet/dist/leaflet.css'

// StrictMode deliberadamente desactivado: su doble montaje de desarrollo (mount → cleanup →
// mount) crea dos llamadas concurrentes a getSession()/onAuthStateChange sobre el cliente
// singleton de Supabase (src/lib/supabase.ts), y esa concurrencia entra en una condición de
// carrera dentro de auth-js que cuelga la pestaña con "Throttling navigation" (confirmado
// empíricamente: el problema desaparece por completo al quitar StrictMode). `client.auth.dispose()`
// -- el mecanismo que auth-js documenta para este escenario exacto (Strict Mode / HMR) -- no aplica
// aquí: también apaga el listener de `visibilitychange` que reinicia el auto-refresh del token, y
// ese listener solo se re-arma al crear el cliente, no al re-suscribirse; como nuestro cliente es
// un singleton a nivel de módulo (nunca se recrea), usar dispose() dejaría el auto-refresh roto
// para el resto de la sesión real del usuario. Impacto real: ninguno — StrictMode nunca duplica
// efectos en producción (`npm run build`), así que esto es puramente una decisión de ergonomía de
// desarrollo local, no un compromiso de comportamiento para usuarios reales.
createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>,
)

registrarServiceWorker()
