import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@runtimes': resolve('runtimes')
      }
    },
    plugins: [react()],
    // runtimes/ lives outside the renderer root; it is imported with ?raw so the exporter can bundle it
    server: { fs: { allow: [resolve('.')] } }
  }
})