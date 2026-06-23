import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // El frontend llama a /api/... y Vite lo reenvía al backend (puerto 4000).
      // Así evitamos problemas de CORS en desarrollo.
      '/api': 'http://localhost:4000',
    },
  },
})
