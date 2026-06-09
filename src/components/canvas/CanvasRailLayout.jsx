import React from 'react';

/**
 * CanvasRailLayout — responsive Canvas/Tool archetype primitive (§112 / responsive
 * Canvas archetype). One component tree, reflows on orientation:
 *   - PORTRAIT  → artifact stacked on top (capped height) + the rail body scrolling
 *                 below it; if there's no rail, the artifact fills.
 *   - LANDSCAPE → artifact MAXIMIZED (flex 1) + the rail collapsed to a fixed-width
 *                 edge column that scrolls.
 *
 * Reusable by the Report+Canvas screens (PlayerStats / ScoutedTeam / LayoutAnalytics)
 * — pass any spatial `artifact` (a canvas) + a `rail` (controls/list).
 *
 * COORDINATE GUARDRAIL (de-risked invariant, do not break): the `artifact` MUST be a
 * canvas that sizes from its OWN container via ResizeObserver (not window.inner*,
 * not width:auto). This layout only resizes the artifact's BOX; the canvas re-fits +
 * its live-rect tap transform stays correct across the reflow.
 */
export default function CanvasRailLayout({ isLandscape, artifact, rail, railWidth = 232, portraitArtifactVh = 46 }) {
  if (isLandscape) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: 8, padding: '0 8px 6px' }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>{artifact}</div>
        {rail && (
          <div style={{ width: railWidth, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 2 }}>
            {rail}
          </div>
        )}
      </div>
    );
  }
  // Portrait: artifact on top (capped to leave room for the rail), rail scrolls below.
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px 6px' }}>
      <div style={{ flex: rail ? `0 0 ${portraitArtifactVh}vh` : 1, minWidth: 0, minHeight: 0, display: 'flex' }}>{artifact}</div>
      {rail && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>{rail}</div>
      )}
    </div>
  );
}
