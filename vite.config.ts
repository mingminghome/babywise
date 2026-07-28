import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { askApiDevPlugin } from './vite.ask-api.ts'

export default defineConfig({
  plugins: [react(), askApiDevPlugin()],
})
