import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@/context': fileURLToPath(new URL('./src/context', import.meta.url)),
      '@/pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/components', import.meta.url)),
    },
  },
  server: {
    middleware: [
      // SPA fallback: serve index.html for client-side routes so direct
      // navigation / refresh to /login/customer, /login/employee, /get-quote works.
      (req, res, next) => {
        if (req.method === 'GET' && req.headers.accept && req.headers.accept.includes('text/html')) {
          const url = req.url || ''
          if (!url.startsWith('/@fs') && !url.startsWith('/@vite') && !url.startsWith('/src') && !url.includes('.')) {
            req.url = '/'
          }
        }
        next()
      }
    ]
  }
})
