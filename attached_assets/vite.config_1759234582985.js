import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: Number(process.env.CLIENT_PORT || 5173),
    proxy: {
      '/api': {
        target: 'http://localhost:' + (process.env.PORT || 5050),
        changeOrigin: true
      }
    }
  }
})
