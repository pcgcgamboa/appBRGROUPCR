import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
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
