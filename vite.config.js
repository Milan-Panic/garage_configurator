import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { libraryApi } from './server/libraryApi.js'

// libraryApi serves /api/library, /api/inquiries and /api/prices.

// Lokalni domeni (npr. sopstveni tunel) stoje u config.js, koji nije u git-u. Primer: config.example.js.
const localFile = new URL('./config.js', import.meta.url)
const local = existsSync(localFile) ? (await import(pathToFileURL(localFile.pathname).href)).default || {} : {}

export default defineConfig({
  plugins: [react(), tailwindcss(), libraryApi()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      '.trycloudflare.com',
      ...(local.allowedHosts || []),
    ],
    watch: {
      ignored: ['**/data/**'],
    },
  },
})
