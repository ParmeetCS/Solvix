import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
