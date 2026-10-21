import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { libraryApi } from './server/libraryApi.js'

// libraryApi serves /api/library, /api/inquiries and /api/prices.

export default defineConfig({
  plugins: [react(), tailwindcss(), libraryApi()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io', '.ngrok.app'],
    watch: {
      ignored: ['**/data/**'],
    },
  },
})
