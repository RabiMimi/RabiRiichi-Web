import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Resolve the client's git commit hash at build time. Cloudflare Pages exposes
// it as CF_PAGES_COMMIT_SHA; fall back to the local git checkout for dev builds.
function resolveCommitHash(): string {
  const fromEnv = process.env.CF_PAGES_COMMIT_SHA;
  if (fromEnv) {
    return fromEnv.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(resolveCommitHash()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      includeAssets: ['favicon.png', 'assets/**/*'],
      manifest: {
        name: 'RabiRiichi',
        short_name: 'RabiRiichi',
        description:
          '开源 3D 浏览器麻将客户端 (Open Source 3D Browser Riichi Mahjong Client)',
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
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,webp,svg,glb,ttf,woff2}'],
        // Max file size for precaching (default is 2MB, our tiles models/assets can be larger)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
    }),
  ],
});
