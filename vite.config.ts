import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.png', 'assets/**/*'],
      manifest: {
        name: 'RabiRiichi',
        short_name: 'RabiRiichi',
        description: '3D Browser Riichi Mahjong Game client',
        theme_color: '#1e2327',
        background_color: '#111111',
        display: 'fullscreen',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precaching all build static assets
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,glb,ttf,woff2}'],
        // Max file size for precaching (default is 2MB, our tiles models/assets can be larger)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
});
