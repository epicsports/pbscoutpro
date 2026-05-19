import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
