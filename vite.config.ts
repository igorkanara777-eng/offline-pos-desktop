// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // критично для loadFile(...)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
