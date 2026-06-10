import React, { useState, useEffect } from 'react';

/**
 * CanvasRailLayout — responsive Canvas/Tool archetype primitive (§113 / responsive
 * Canvas archetype; DESIGN_DECISIONS). One component tree, reflows on orientation:
 *
 *   - PORTRAIT  → `header` full-bleed on top, then the field HERO (capped height,
 *                 full-width) over the `rail` content, then `hint` full-bleed at the
 *                 bottom. Unchanged from the original stacked layout.
 *   - LANDSCAPE → the field/heatmap is the HERO and fills 100% OF HEIGHT (100dvh
 *                 minus safe-area); its native `aspect` drives its width. The rail is
 *                 RESIDUAL (leftover width, down to `railMin`) and holds ALL chrome —
 *                 `header` (compact nav) at the top, `rail` content in the middle
 *                 (scrolls), `hint` pinned at the bottom. NOTHING renders above or
 *                 below the field/rail row. `side` controls the rail edge (default
 *                 'left' — approved §113 mockup: rail LEFT, hero field RIGHT).
 *
 *   Edge case (rail would drop below `railMin`): the rail holds `railMin` and the
 *   field yields width; with the aspect-locked box that scales the field down
 *   uniformly — never a crop. On most landscape ratios the field reaches ~100dvh;
 *   ratios narrow relative to `aspect` (small iPads/phones) land lower by geometry.
 *
 * ACTIVATION: orientation is decided by VIEWPORT GEOMETRY (`innerWidth > innerHeight`)
 * — any device, any size, no device-class/touch/width gate (fixes the desktop-landscape
 * miss). Pass `isLandscape` to override (tests); omit to self-determine.
 *
 * Reusable by the Report+Canvas screens (PlayerStats / ScoutedTeam / LayoutAnalytics).
 *
 * COORDINATE GUARDRAIL (de-risked invariant, do not break): the `artifact` MUST be a
 * canvas that sizes from its OWN container via ResizeObserver (not window.inner*,
 * not width:auto). This layout sizes the artifact's BOX from CSS (aspect-ratio / vh) —
 * independent of the canvas content, so there's no feedback loop — and the canvas
 * re-fits + keeps its live-rect tap transform correct across the reflow.
 */
function useViewportLandscape() {
  const read = () => (typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false);
  const [ls, setLs] = useState(read);
  useEffect(() => {
    const on = () => setLs(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return ls;
}

export default function CanvasRailLayout({
  isLandscape, artifact, rail, header = null, hint = null,
  aspect = 16 / 10, railMin = 200, portraitArtifactVh = 46, side = 'left',
}) {
  const auto = useViewportLandscape();
  const landscape = isLandscape !== undefined ? isLandscape : auto;

  if (landscape) {
    // HERO: 100% height, native aspect → width; flex-shrink lets it yield only
    // when the rail would otherwise fall below railMin. The canvas inside contain-
    // fits + centers, so in the yield case the field reads as centered in its
    // column (balanced gaps) rather than floating against one edge.
    const hero = (
      <div key="hero" style={{ flex: '0 1 auto', height: '100%', aspectRatio: String(aspect), minWidth: 0, display: 'flex' }}>
        {artifact}
      </div>
    );
    // RAIL: residual width; holds ALL chrome — header (top) · content (scroll) · hint (bottom).
    const railEl = (
      <div key="rail" style={{ flex: '1 1 0', minWidth: railMin, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {header}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{rail}</div>
        {hint}
      </div>
    );
    // side='left' (default, approved §113 mockup): rail LEFT, hero RIGHT.
    return (
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'stretch',
        // No vertical padding (the field must reach 100dvh); only the notch safe-area insets.
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}>
        {side === 'left' ? [railEl, hero] : [hero, railEl]}
      </div>
    );
  }
  // Portrait: header full-bleed top · padded field(capped) over rail · hint full-bleed bottom.
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px 6px' }}>
        <div style={{ flex: rail ? `0 0 ${portraitArtifactVh}vh` : 1, minWidth: 0, minHeight: 0, display: 'flex' }}>{artifact}</div>
        {rail && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{rail}</div>
        )}
      </div>
      {hint}
    </div>
  );
}
