import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirige http://localhost:5173/publish -> http://localhost:8081/publish
      '/publish': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // Redirige http://localhost:5173/analytics -> http://localhost:8081/analytics
      '/analytics': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      }
    }
  }
})