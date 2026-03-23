import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('recharts')) {
            return 'vendor-recharts'
          }

          if (id.includes('react-router') || id.includes('@remix-run')) {
            return 'vendor-router'
          }

          if (
            id.includes('socket.io-client') ||
            id.includes('engine.io-client') ||
            id.includes('socket.io-parser')
          ) {
            return 'vendor-socket'
          }

          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react'
          }

          return undefined
        },
      },
    },
  },
})
