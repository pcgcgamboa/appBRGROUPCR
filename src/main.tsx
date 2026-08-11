import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/app'
import { AppProviders } from '@/app/providers'
import '@/styles/globals.css'
import 'leaflet/dist/leaflet.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
