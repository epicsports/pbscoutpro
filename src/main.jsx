import { initSentry } from './services/sentry';
initSentry();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { reloadOnceForStaleChunk, clearStaleChunkGuard } from './utils/staleChunkReload';
import { setHeatmapScheme } from './utils/theme';

// Colour-blind mode (per-device): ONE setting drives heatmaps + the §115 intensity
// ramp. Read at boot so every canvas draws with the active scheme; toggled in the
// More tab (which reloads to re-apply app-wide). See theme.js / MoreShell.
try {
  if (localStorage.getItem('pbscoutpro-colorblind') === 'on') setHeatmapScheme('colorblind');
} catch (_) { /* storage disabled */ }

// Self-healing stale-chunk reload. After a deploy, a cached index.html imports
// rotated chunk hashes that 404 → Vite emits `vite:preloadError`. preventDefault
// so it doesn't bubble to the ErrorBoundary/Sentry as an error, then reload once
// (loop-guarded) to fetch the fresh bundle.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  reloadOnceForStaleChunk();
});

// Emulator-only test bridge (window.__pbtest). Guarded so it's dead-eliminated
// from prod/dev/CI builds — verified by a dist grep for `__pbtest`.
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  import('./services/testBridge').then(m => m.installTestBridge());
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Clear the stale-chunk loop guard after the app has run healthily past the
// guard window (~30s > 20s). Delayed (not on bare mount) so an auto-loading
// route chunk that 404s can't clear the guard early and loop.
setTimeout(clearStaleChunkGuard, 30_000);

// Service-worker registration is auto-injected by vite-plugin-pwa
// (registerType:'autoUpdate', injectRegister:'auto') — the Workbox SW precaches
// the build's hashed asset manifest so the app shell boots offline. The old
// hand-written registration (scope-pinned to BASE_URL after the B21 fix) is
// retired with public/sw.js.
//
// One-time purge of the legacy hand-written cache ('pbscoutpro-v2'). The old SW
// is replaced by Workbox's; this only orphaned a CacheStorage bucket. Safe: the
// old→new SW transition only happens online (you fetched the new index.html with
// signal), so deleting it never strands an offline boot.
if ('caches' in window) {
  caches.delete('pbscoutpro-v2').catch(() => { /* non-fatal */ });
}
