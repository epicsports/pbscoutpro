import { initSentry } from './services/sentry';
initSentry();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

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
