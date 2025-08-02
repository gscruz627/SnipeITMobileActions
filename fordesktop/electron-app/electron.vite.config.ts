import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    server: {
      https:{
        key: fs.readFileSync('./192.168.1.143-key.pem'),
        cert: fs.readFileSync('./192.168.1.143.pem')
      },
      host: true,
      port: 5173
    }
  },

})
