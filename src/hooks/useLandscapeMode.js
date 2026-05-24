import { useCallback, useState } from 'react';
import { useDevice } from './useDevice';

/**
 * § 64.8.4 — landscape mode + canvas max-height consolidation.
 *
 * Owns two things that are currently rosmarowane across consumer pages:
 *   1. the `device.isLandscape && !device.isDesktop` formula (today inlined
 *      at LayoutDetailPage:262, MatchPage:70, …),
 *   2. the `window.innerHeight − N` canvas-height pattern (today inlined
 *      at 7+ consumer sites with per-site offsets — see the canonical
 *      table below).
 *
 * API:
 *
 *   const { isLandscape, canvasMaxHeight } = useLandscapeMode();
 *   const h = canvasMaxHeight(landscapeOffset, portraitOffset);
 *
 * `canvasMaxHeight(landscapeOffset = 0, portraitOffset = 0)` returns
 * `window.innerHeight − offset` where the offset is picked by the current
 * orientation. Default `0` reproduces the "full window height" literal that
 * landscape-aware sites pass today (e.g. `MatchPage:1837` →
 * `isLandscape ? window.innerHeight : window.innerHeight − 180`).
 *
 * SSR-safe — `canvasMaxHeight` returns `null` when `typeof window === 'undefined'`,
 * matching the `typeof window !== 'undefined' ? … : null` pattern at every
 * current consumer site.
 *
 * ─── READ-EQUIVALENCE INVARIANT (§ 64.9 Step 2 / additive) ─────────────────
 * This hook does NOT change consumer behavior in Step 2. It exists to be
 * consumed by `BaseCanvas` (built in the same step) and — at § 64.9 step #4
 * onwards — by migrating pages. The per-site offsets below are LOAD-BEARING
 * for those migrations: each site must be passed verbatim (no rounding, no
 * "normalization"). Treat as canonical. Verified against `git main` 2026-05-23.
 *
 * | Site                          | landscapeOffset | portraitOffset | Today's literal                                   |
 * |-------------------------------|-----------------|-----------------|---------------------------------------------------|
 * | `MatchPage.jsx:1837`          | 0               | 180             | `isLandscape ? innerHeight : innerHeight - 180`   |
 * | `TacticPage.jsx:435`          | 0               | 200             | `isLandscape ? innerHeight : innerHeight - 200`   |
 * | `LayoutDetailPage.jsx:397`    | 20              | 200             | `isLandscape ? innerHeight - 20 : innerHeight - 200` |
 * | `HeatmapCanvas.jsx:36`        | 200             | 200             | `innerHeight - 200` (no orientation branch)       |
 * | `BunkerEditorPage.jsx:176`    | 160             | 160             | `innerHeight - 160` (no branch)                   |
 * | `LayoutAnalyticsPage.jsx:122` | 90              | 90              | `innerHeight - 90`  (no branch)                   |
 * | `BallisticsPage.jsx:92`       | 140             | 140             | `innerHeight - 140` (no branch) — **Opus territory, off-limits to canvas refactor** |
 *
 * `canvasMaxHeight` is memoised on `isLandscape` so consumers can use the
 * return value in `useEffect` / `useMemo` deps without re-running on every
 * render.
 */
export function useLandscapeMode() {
  const device = useDevice();
  const isLandscape = !!(device.isLandscape && !device.isDesktop);

  // § 76 — Stage 1 full-screen. `fsActive` is the portrait-FS toggle state.
  // Landscape already auto-immerses (existing behavior preserved); `fsActive`
  // is an ADDITIONAL trigger that user can flip in portrait via the shared
  // <FullscreenToggle>. `immersive` is the unified flag every chrome-hide /
  // fit-to-viewport site reads going forward. `fsActive` is a purely
  // portrait-state: in landscape it is visually moot (`immersive` is true
  // from rotation regardless), and on return to portrait the user sees
  // `fsActive` as they left it — no auto-reset. Stuck-state safety = the
  // shared <FullscreenToggle> stays visible in portrait-FS so manual exit
  // is always available.
  const [fsActive, setFsActive] = useState(false);
  const setFullscreen = useCallback((next) => setFsActive(!!next), []);
  const immersive = isLandscape || fsActive;

  const canvasMaxHeight = useCallback((landscapeOffset = 0, portraitOffset = 0) => {
    if (typeof window === 'undefined') return null;
    // § 76 — immersive (landscape OR portrait-FS) gets the landscape offset
    // (= field fills viewport). Today's landscape behavior unchanged because
    // landscape is a subset of immersive.
    const offset = immersive ? landscapeOffset : portraitOffset;
    return window.innerHeight - offset;
  }, [immersive]);

  return { isLandscape, fsActive, immersive, setFullscreen, canvasMaxHeight };
}
