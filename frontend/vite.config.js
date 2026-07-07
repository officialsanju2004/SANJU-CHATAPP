import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',

      // ⚠️ FIX: previously this used the default "generateSW" strategy,
      // which makes vite-plugin-pwa GENERATE its own Workbox service worker
      // and write it to dist/sw.js — the exact same filename as our
      // hand-written public/sw.js (which has the push-notification logic).
      // During build, the generated one silently overwrote ours, so the
      // service worker that actually ran in production had no push/message
      // handling -> Chrome fell back to its generic
      // "This site has been updated in the background" notification.
      //
      // "injectManifest" instead takes OUR OWN service worker (src/sw.js)
      // as the source of truth and just injects the precache manifest into
      // it, so our push/notificationclick/message handlers are preserved.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      // We already register the service worker manually in main.jsx, so
      // don't let vite-plugin-pwa inject its own registration script too
      // (that was causing a second, redundant registration).
      injectRegister: false,

      injectManifest: {
        // Our sw.js doesn't need any extra globs; keep default behavior.
      },

      devOptions: {
        enabled: true,
        type: 'module',
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
            type: 'image/jpeg',
          },
          {
            src: '/icons/icon2.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
