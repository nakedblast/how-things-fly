import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the project site under /how-things-fly/; `vite preview` matches it, the dev server stays at /.
  base: command === 'build' || isPreview ? '/how-things-fly/' : '/',
  plugins: [react()],
  // The lazy 3D chunk (three.js + R3F) is about 935 kB minified by design; the initial chunk stays small.
  build: { chunkSizeWarningLimit: 1000 },
}))
