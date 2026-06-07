import { useEffect, useState } from 'react';

/**
 * E6 — KIOSK form-factor gate (Part 1 + Part 2, 2026-06-06).
 *
 * WIDTH floor (MIN_WIDTH=1024) is the § 27 driver and is UNCHANGED. The lobby's
 * 5-tile grid is width-driven (PlayerTile is fixed-height + fixed type; columns
 * are 1fr) — below 1024px each tile compresses past the 32px Avatar floor + the
 * § 27 typography floor. A short viewport does NOT shrink tiles (the grid just
 * scrolls), so the height axis is not a § 27 constraint.
 *
 * HEIGHT floor (MIN_HEIGHT=600) is the lobby's real content-minimum, not a § 27
 * constraint: header 56 + grid padding + one 200px tile row ≈ 300px, +margin.
 * Lowered from 768 (the old symmetric iPad-landscape partner) so 1366×768
 * laptops (usable height ~640 after browser chrome) and iPad-landscape reach the
 * lobby instead of a futile rotate prompt.
 *
 * FALLBACK ROUTING (KioskLobbyOverlay, Part 2): the rotate prompt fires ONLY
 * when rotating would actually satisfy the floors (portrait tablet); otherwise
 * an honest "needs a tablet/laptop" message — never a futile "rotate" on a
 * device that can't fit in EITHER orientation. The hand-around CTA itself is
 * entry-gated by `canEverFitKioskLobby()` so phones never reach this overlay.
 *
 * The § 35 HotSheet is NOT a lobby fallback — it is a single-player, own-phone
 * self-log path (different device/user), off by default (featureFlags.selfLog).
 */
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 600;

function checkKioskCompatible() {
  if (typeof window === 'undefined') return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w < MIN_WIDTH || h < MIN_HEIGHT) return false;
  // Landscape required
  if (w <= h) return false;
  return true;
}

export function isKioskCompatible() {
  return checkKioskCompatible();
}

/**
 * canEverFitKioskLobby — capability test for the ENTRY gate ("Przekaż graczom").
 * Uses the device's longer PHYSICAL edge (window.screen), which is stable across
 * rotation, unlike the chrome-dependent viewport. A phone is < MIN_WIDTH in BOTH
 * orientations → returns false → the hand-around isn't offered (E6 phone path:
 * the coach just proceeds with "Następny punkt"). A tablet (e.g. 768×1024)
 * returns true even in portrait — it fits once rotated (handled by useKioskMode).
 */
export function canEverFitKioskLobby() {
  if (typeof window === 'undefined' || !window.screen) return false;
  const longEdge = Math.max(window.screen.width || 0, window.screen.height || 0);
  return longEdge >= MIN_WIDTH;
}

/**
 * evalKioskMode — fallback mode for the lobby overlay:
 *   'lobby'   — fits now (compatible) → render the 5-tile lobby.
 *   'rotate'  — portrait, but rotating to landscape WOULD satisfy both floors
 *               (portrait tablet) → rotate prompt (rotating actually helps).
 *   'message' — can't fit and rotating wouldn't help (phone / too-small window)
 *               → honest "needs a tablet/laptop" message, never a futile rotate.
 */
function evalKioskMode() {
  if (typeof window === 'undefined') return 'message';
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w >= MIN_WIDTH && h >= MIN_HEIGHT && w > h) return 'lobby';
  // Portrait where the rotated dims would clear both floors → rotating helps.
  if (w <= h && h >= MIN_WIDTH && w >= MIN_HEIGHT) return 'rotate';
  return 'message';
}

/**
 * Hook returning current KIOSK compatibility. Re-evaluates on resize +
 * orientationchange so a tablet rotated mid-session updates correctly.
 */
export function useKioskCompatible() {
  const [compatible, setCompatible] = useState(checkKioskCompatible);
  useEffect(() => {
    const onChange = () => setCompatible(checkKioskCompatible());
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
    };
  }, []);
  return compatible;
}

/**
 * useKioskMode — reactive fallback mode ('lobby' | 'rotate' | 'message'),
 * re-evaluated on resize + orientationchange so a portrait tablet swaps
 * rotate→lobby the moment it's rotated to landscape.
 */
export function useKioskMode() {
  const [mode, setMode] = useState(evalKioskMode);
  useEffect(() => {
    const onChange = () => setMode(evalKioskMode());
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
    };
  }, []);
  return mode;
}
