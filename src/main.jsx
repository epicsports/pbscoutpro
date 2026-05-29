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

// Register Service Worker. Scope is pinned to BASE_URL ('/pbscoutpro/' on GH
// Pages, '/' in dev) and the promise is caught — previously the registration
// rejected silently on the GH Pages base path (Sentry "register Rejected" /
// B21). A failed SW only disables the offline app shell; Firestore IndexedDB
// persistence (the real offline data layer) is independent of the SW.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + 'sw.js', { scope: import.meta.env.BASE_URL })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}
