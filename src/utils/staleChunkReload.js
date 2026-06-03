import { captureMessage } from '../services/sentry';

/**
 * Self-healing stale-chunk reload.
 *
 * After a deploy, a client holding a cached `index.html` tries to import the
 * OLD hashed chunk names (`vendor-react-*.js`) which 404 on the new bundle →
 * "Importing a module script failed" → degraded render. The fix is to reload
 * once (fetches fresh index.html + chunk manifest), guarded against a loop so a
 * genuinely-broken deploy still surfaces instead of reloading forever.
 *
 * Wired from two places:
 *  - `main.jsx` window `vite:preloadError` listener (primary — preventDefault'd,
 *    so it never reaches the ErrorBoundary / Sentry as an error).
 *  - `App.jsx` Sentry ErrorBoundary `onError` (fallback — for an import error
 *    that propagates into React render instead of firing preloadError).
 */

const KEY = 'staleChunkReloadAt';
// If we reload and the SAME failure recurs within this window, it's a broken
// deploy (not a stale cache) → stop reloading and let the error surface.
const GUARD_WINDOW_MS = 20_000;

export const STALE_CHUNK_RE =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError/i;

export function isStaleChunkError(err) {
  const msg = (err && (err.message || (typeof err === 'string' ? err : ''))) || '';
  return STALE_CHUNK_RE.test(msg);
}

/**
 * Reload once to fetch the fresh bundle. Returns true if a reload was triggered,
 * false if suppressed by the loop guard (recent reload already failed again).
 */
export function reloadOnceForStaleChunk() {
  let last = 0;
  try { last = Number(sessionStorage.getItem(KEY)) || 0; } catch { /* private mode */ }
  const now = Date.now();
  // Already self-healed within the guard window and we're erroring AGAIN →
  // genuine broken deploy. Do NOT reload; let the ErrorBoundary show its UI +
  // Sentry log at error level.
  if (last && now - last < GUARD_WINDOW_MS) return false;
  try { sessionStorage.setItem(KEY, String(now)); } catch { /* private mode */ }
  // Info-level (NOT error) so self-heals are visible without inflating errors.
  try { captureMessage('stale-chunk self-heal reload', 'info'); } catch { /* never block reload */ }
  window.location.reload();
  return true;
}

/**
 * Clear the loop guard once the app has run healthily. Called on a DELAY past
 * the guard window (not immediately on mount) so an auto-loading route chunk
 * that 404s can't defeat the guard and loop. After the delay the key is stale
 * anyway (the window expired), so this is a harmless cleanup that lets a future
 * deploy self-heal without waiting out the window.
 */
export function clearStaleChunkGuard() {
  try { sessionStorage.removeItem(KEY); } catch { /* private mode */ }
}
