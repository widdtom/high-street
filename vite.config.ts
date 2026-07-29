/* =============================================================================
 * HIGH STREET — build configuration
 *
 * PRIVACY IS A HARD REQUIREMENT: the app makes ZERO network requests at
 * runtime. No analytics, no telemetry, no error reporting, no CDN fonts, no
 * remote images, no APIs. Everything is bundled or generated in code, and the
 * service worker precaches all of it so the game works in aeroplane mode.
 * A `connect-src 'none'` CSP in index.html enforces this at runtime.
 *
 * DEPLOY TARGET: GitHub Pages project site at
 *   https://widdtom.github.io/high-street/
 * so `base` MUST be '/high-street/' and the service worker scope, start_url and
 * navigateFallback must all sit under that same path. Getting the scope wrong
 * is the single most common reason a Pages-hosted PWA refuses to install.
 * ============================================================================= */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Must match the GitHub Pages project path exactly, with both slashes. */
const BASE = '/high-street/';

export default defineConfig({
  base: BASE,

  plugins: [
    react(),

    VitePWA({
      // Ship updates silently: a six-year-old should never see a reload prompt.
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Emitted at dist/sw.js, i.e. served from `${BASE}sw.js`, so the default
      // registration scope is already `${BASE}` — but we pin it anyway.
      filename: 'sw.js',
      strategies: 'generateSW',
      base: BASE,
      scope: BASE,

      // NOTE: no `includeAssets`. Everything in public/ is copied into dist/
      // and is already swept up by workbox.globPatterns below; listing the
      // icons again only duplicates them in the precache manifest. Same reason
      // for turning off the plugin's automatic manifest-icon injection.
      includeManifestIcons: false,

      manifest: {
        name: 'High Street',
        short_name: 'High Street',
        description: 'A quiet British high street where you learn about money.',
        lang: 'en-GB',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'landscape',
        // Both are relative to the manifest, which is emitted at `${BASE}`.
        start_url: BASE,
        scope: BASE,
        id: BASE,
        background_color: '#f4ead8',
        theme_color: '#f4ead8',
        categories: ['education', 'games'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            // ~19% padding all round, comfortably inside the 80% safe zone.
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Precache EVERYTHING so first launch is the only launch that needs a
        // network. woff2 is listed for completeness; we ship no web fonts.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        // Single-page app: every navigation resolves to the base index.html.
        navigateFallback: `${BASE}index.html`,
        // Deliberately empty: any runtime caching rule would imply a network
        // fetch, and this app must never make one.
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // The whole game is small; raise the ceiling so nothing silently drops
        // out of the precache manifest and breaks offline play.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },

      // No service worker during `vite dev` — it only makes debugging confusing.
      devOptions: { enabled: false },
    }),
  ],

  build: {
    target: 'es2020',
    // Drop Vite's modulepreload polyfill. It is the ONLY thing in the bundle
    // that calls fetch(), and while it only ever fetches same-origin hrefs,
    // `connect-src 'none'` would block it anyway and Safari 17+ (the iPad we
    // target) supports modulepreload natively. Removing it means the shipped
    // JavaScript contains no network primitive at all.
    modulePreload: { polyfill: false },
    // Source maps would be dead weight on an iPad home-screen app.
    sourcemap: false,
    assetsInlineLimit: 4096,
  },

  server: {
    host: true,
  },
});
