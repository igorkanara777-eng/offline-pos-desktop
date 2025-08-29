// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // КРИТИЧНО: для Electron нужен относительный base, иначе белый экран
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
