import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: "auto",
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Sanju Chat',
        short_name: 'Sanju Chat',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          {
            src: '/icons/icon1.jpeg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/icons/icon2.jpeg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
  }
});