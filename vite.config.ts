import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The lazy 3D chunk (three.js + R3F) is about 935 kB minified by design; the initial chunk stays small.
  build: { chunkSizeWarningLimit: 1000 },
})
