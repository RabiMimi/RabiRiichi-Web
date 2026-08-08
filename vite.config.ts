import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin as VitePlugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import {
  assertNoPrecacheConflicts,
  extractPrecacheEntries,
} from './src/build/precacheGuard';

/**
 * Refuses to ship a service worker whose precache list workbox would reject.
 *
 * Reads the emitted worker rather than hooking `manifestTransforms`, which runs
 * before workbox appends `additionalManifestEntries` and so cannot see the
 * entries that broke this last time.
 */
function precacheManifestGuard(): VitePlugin {
  return {
    name: 'rabiriichi:precache-manifest-guard',
    apply: 'build',
    enforce: 'post',
    // `closeBundle` is a parallel hook and vite-plugin-pwa writes the worker
    // from its own, so without sequential+post this reads whatever sw.js the
    // previous build left behind — it passes and proves nothing.
    closeBundle: {
      sequential: true,
      order: 'post',
      handler() {
        const swPath = resolve(__dirname, 'dist/sw.js');
        let source: string;
        try {
          source = readFileSync(swPath, 'utf8');
        } catch {
          // Deliberately fatal. A guard that quietly skips when it cannot find
          // its target is worse than none: it reports success forever.
          throw new Error(
            `Precache guard found no service worker at ${swPath}. If this ` +
              `build should produce one, the guard is running too early.`,
          );
        }

        const entries = extractPrecacheEntries(source);
        if (entries.length === 0) {
          throw new Error(
            `Could not read a precache list out of ${swPath}. The guard ` +
              `cannot vouch for this build; check whether the generated ` +
              `worker's shape changed.`,
          );
        }
        assertNoPrecacheConflicts(entries);
      },
    },
  };
}

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
      // The app asks before taking an update (see src/ui/UpdatePrompt.tsx), so
      // it registers the worker itself via `virtual:pwa-register/react` rather
      // than having a bare registration injected.
      registerType: 'prompt',
      injectRegister: null,
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
        // Precache every build output AND everything Vite copied out of
        // `public/`, so a warm install never touches the network again.
        //
        // Do NOT reintroduce `includeAssets` here. It is not a second glob:
        // the plugin turns it into `additionalManifestEntries` carrying an md5
        // revision, while these patterns already match the very same files
        // under `dist/assets/`. Every overlapping URL then lands in the
        // manifest twice with conflicting revisions, and workbox rejects the
        // whole list with `add-to-cache-list-conflicting-entries` — thrown
        // inside the generated worker's async `define()` callback, so it
        // surfaces as an unhandled rejection and the worker still reports
        // itself activated while precaching, cache cleanup and the navigation
        // route silently never run.
        globPatterns: [
          '**/*.{js,css,html,ico,png,jpg,webp,svg,glb,ttf,otf,woff2,mp3,wav}',
        ],
        // Max file size for precaching (default is 2MB, our tiles models/assets can be larger)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // clientsClaim must be set by hand: the plugin only derives it from
        // `registerType: 'autoUpdate'`. Without it the very first visit stays
        // uncontrolled, so that session pays the whole precache download and
        // reads none of it.
        clientsClaim: true,
        // Deliberately NOT skipWaiting. A new worker activating under a running
        // client swaps the precache mid-hand; instead the app offers the update
        // between games and posts SKIP_WAITING when the player accepts.
        skipWaiting: false,
        // The Japanese face is only needed by Japanese players, so keep it out
        // of every install's precache; it is still fetched on demand. The
        // Chinese subset and the tiny table-centre cuts ship eagerly.
        globIgnores: ['**/YujiSyuku-Regular.subset.woff2'],
        // The plugin default is `/^assets\//`, which assumes everything under
        // `assets/` carries a content hash. Ours does not: `public/assets/**`
        // is copied verbatim, so that default marks all of it `revision: null`
        // (immutable) and a redrawn texture or reissued font would never
        // invalidate. Only Vite's own `name-<8 char hash>.ext` output is
        // genuinely immutable.
        dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8}\.[A-Za-z0-9]+$/,
      },
    }),
    precacheManifestGuard(),
  ],
});
