import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { AppProviders } from '@/app/providers'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/styles/globals.css'
import 'leaflet/dist/leaflet.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
