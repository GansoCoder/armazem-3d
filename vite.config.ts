import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // O núcleo do three.js (~950 kB) só é carregado com a vista 3D, num chunk separado.
    chunkSizeWarningLimit: 1100,
  },
})
