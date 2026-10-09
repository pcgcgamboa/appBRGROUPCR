import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': nunca recarga sola — solo activa la versión nueva cuando el usuario confirma
      // en el toast (ver src/lib/pwa.ts), para no interrumpir un formulario a medio llenar.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'br-mantenimiento-logo.png'],
      manifest: {
        name: 'Solicitudes de servicio',
        short_name: 'Solicitudes',
        description: 'Gestión de solicitudes de servicio',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: 'hsl(215 75% 36%)',
        background_color: 'hsl(210 40% 98%)',
        icons: [{ src: '/br-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
      },
      // Sin workbox.runtimeCaching: ninguna llamada a Supabase (otro origen) se cachea ni se pone
      // en cola — el Service Worker solo precachea el shell estático del build (JS/CSS/HTML/
      // íconos) y sirve ese shell cuando falta red. Cualquier lectura/escritura de datos real
      // sigue yendo siempre a la red, igual que hoy.
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('/recharts/')) return 'graficas'
          if (
            id.includes('/victory-vendor/') ||
            id.includes('/decimal.js-light/') ||
            /\/node_modules\/d3-[^/]+\//.test(id)
          ) {
            return 'graficas-matematicas'
          }
          if (
            id.includes('/@reduxjs/') ||
            id.includes('/react-redux/') ||
            id.includes('/redux/') ||
            id.includes('/redux-thunk/') ||
            id.includes('/reselect/') ||
            id.includes('/immer/')
          ) {
            return 'graficas'
          }
          if (id.includes('/@supabase/')) return 'supabase'
          if (
            id.includes('/react-hook-form/') ||
            id.includes('/@hookform/resolvers/') ||
            id.includes('/zod/')
          ) {
            return 'formularios'
          }
        },
      },
    },
  },
})
