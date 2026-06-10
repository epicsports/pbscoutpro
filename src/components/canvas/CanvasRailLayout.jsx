import React from 'react';

/**
 * CanvasRailLayout — responsive Canvas/Tool archetype primitive (§112 / responsive
 * Canvas archetype; DESIGN_DECISIONS). One component tree, reflows on orientation:
 *
 *   - PORTRAIT  → the field is the HERO ON TOP, full-width + capped height; the rail
 *                 (mode switcher + per-mode content) stacks BELOW it and scrolls.
 *   - LANDSCAPE → the field/heatmap is the HERO and fills 100% OF HEIGHT — its native
 *                 `aspect` drives its width. The rail is RESIDUAL: it takes only the
 *                 leftover width, down to a usable `railMin`. The field YIELDS (shrinks)
 *                 only if the rail would otherwise drop below `railMin`. This is the
 *                 corrected landscape rule — NOT a fixed-width rail with the field in
 *                 the remainder (the field starts maximized; the rail is what's left).
 *                 `side` controls which edge the rail sits on (default 'left' — the
 *                 approved §113 mockup put the rail on the LEFT, hero field on the RIGHT).
 *
 * Reusable by the Report+Canvas screens (PlayerStats / ScoutedTeam / LayoutAnalytics).
 *
 * COORDINATE GUARDRAIL (de-risked invariant, do not break): the `artifact` MUST be a
 * canvas that sizes from its OWN container via ResizeObserver (not window.inner*,
 * not width:auto). This layout sizes the artifact's BOX from CSS (aspect-ratio / vh) —
 * independent of the canvas content, so there's no feedback loop — and the canvas
 * re-fits + keeps its live-rect tap transform correct across the reflow.
 */
export default function CanvasRailLayout({
  isLandscape, artifact, rail, aspect = 16 / 10, railMin = 200, portraitArtifactVh = 46, side = 'left',
}) {
  if (isLandscape) {
    // HERO: 100% height, native aspect → width; flex-shrink lets it yield only
    // when the rail would otherwise fall below railMin.
    const hero = (
      <div key="hero" style={{ flex: '0 1 auto', height: '100%', aspectRatio: String(aspect), minWidth: 0, display: 'flex' }}>
        {artifact}
      </div>
    );
    const railEl = rail && (
      <div key="rail" style={{ flex: '1 1 0', minWidth: railMin, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {rail}
      </div>
    );
    // side='left' (default, approved §113 mockup): rail LEFT, hero RIGHT.
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: 8, padding: '0 8px 6px', alignItems: 'stretch' }}>
        {side === 'left' ? [railEl, hero] : [hero, railEl]}
      </div>
    );
  }
  // Portrait: field on top (capped to leave room), rail stacks below.
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px 6px' }}>
      <div style={{ flex: rail ? `0 0 ${portraitArtifactVh}vh` : 1, minWidth: 0, minHeight: 0, display: 'flex' }}>{artifact}</div>
      {rail && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{rail}</div>
      )}
    </div>
  );
}
