import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/pbscoutpro/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          // ALL React-ecosystem libs MUST share a chunk — they reference React
          // at module-init (forwardRef / createContext / hooks) and would crash
          // if loaded before vendor-react.
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
