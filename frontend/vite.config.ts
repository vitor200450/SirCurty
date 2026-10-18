import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /api/* and /s/* to the NestJS API in development.
      // This avoids CORS issues since both origins appear the same to the browser.
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      
      
    },
  },
})
