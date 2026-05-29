import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '..'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../../web-dist',
    emptyOutDir: true,
  },
})
