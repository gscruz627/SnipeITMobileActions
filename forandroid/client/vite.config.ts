import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.join(__dirname, "../www")
  }, server: {
    host: '0.0.0.0', // or your machine's IP like '192.168.1.100'
    port: 5173        // optional, defaults to 5173
  }
})
