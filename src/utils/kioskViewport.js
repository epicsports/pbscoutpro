import { useEffect, useState } from 'react';

/**
 * E6 — KIOSK form-factor gate. KIOSK lobby + post-save summary render
 * only on tablet landscape ≥ 1024×768 per CC_BRIEF_KIOSK_B_LOBBY decision
 * (2026-04-29). Phone or tablet portrait → fallback to § 35 Tier 1 HotSheet
 * (existing FAB on MatchPage).
 *
 * Why the gate exists (also § 27 enforcement):
 * Rendering a 5-tile grid in <1024px width would compress each tile to
 * ~120px wide — photo zone shrinks below the 32px Avatar floor + padding,
 * status bar 6px becomes meaningless at that scale, and identity text
 * (firstname/lastname/nick/jersey) collapses below the § 27 typography
 * floor. § 35 Tier 1 HotSheet is phone-natywne and § 27-compliant; let
 * it handle small-screen self-log instead of forcing KIOSK there.
 */
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 768;

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
