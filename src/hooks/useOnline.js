import { useSyncExternalStore } from 'react';

/**
 * useOnline — live `navigator.onLine` as React state via the online/offline
 * events. Shared by the OfflineBanner (venue connectivity affordance) and the
 * offline-aware LoginPage ("connect once to sign in"). The server snapshot is
 * `true` (SSR/no-window safety; this app is client-only).
 */
export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
