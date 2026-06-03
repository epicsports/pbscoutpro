import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // PWA cold-boot (§ PWA_COLDBOOT). Replaces the hand-written public/sw.js.
    // Workbox precaches the build's REAL hashed JS/CSS/HTML manifest atomically
    // → closes both shell holes (unvisited lazy-route chunks + post-deploy
    // dangling chunk). `base` (/pbscoutpro/) flows from Vite, so scope/start_url
    // are correct on GH Pages. autoUpdate + skipWaiting + clientsClaim = clean
    // takeover from the old SW; cleanupOutdatedCaches purges stale precaches.
    // The running session isn't disrupted (chunks already in memory; a new SW
    // only applies on the next load — and the scout-draft autosave + Firestore
    // write-queue make any reload loss-free). manifest:false keeps the existing
    // hand-written public/manifest.json + its index.html <link>.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,json}'],
        // `logo.png` is the LoginPage <picture> PNG *fallback* — `logo.webp`
        // (precached) is served to every webp-capable browser (~all). Keep the
        // PNG deployed for the rare no-webp case, but exclude its 417KB from the
        // install precache. See § SW precache trim.
        globIgnores: ['logo.png'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Runtime image cache (parity with the old SW's cache-first images).
        // App field images are base64 in Firestore docs (served from IndexedDB,
        // not HTTP) — this only catches any same-origin image loaded by URL.
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: process.env.NODE_ENV === 'production' ? '/pbscoutpro/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    // vendor-firebase chunk is ~570kB raw / 135kB gzipped (firebase/firestore
    // + auth + app, already minimal — no full SDK import, no storage/functions).
    // Sub-500kB is physically unattainable for current Firebase SDK without
    // dynamic import refactor (deferred). Raised limit to 600kB to suppress
    // warning noise while keeping the threshold meaningful for FUTURE
    // chunks. See docs/PROJECT_GUIDELINES.md § 11 — Bundle chunking strategy.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // ALL React-ecosystem libs MUST share a chunk — they reference React
          // at module-init (forwardRef / createContext / hooks) and would crash
          // if loaded before vendor-react. See PROJECT_GUIDELINES § 11 for
          // April 2026 white-screen precedent.
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/lucide-react/') ||
            id.includes('node_modules/@radix-ui/') ||
            /node_modules\/react-[a-z-]+\//.test(id)
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/@sentry/') || id.includes('node_modules/@sentry-internal/')) {
            return 'vendor-sentry';
          }
          return 'vendor-misc';
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
