import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';

/**
 * FullscreenToggle — § 76 Stage 1.
 *
 * Shared portrait-FS trigger for data-canvas surfaces (MatchPage scout,
 * TacticPage, fast-follow: ScoutedTeam / LayoutDetail / BunkerEditor /
 * LayoutAnalytics). Renders NULL in landscape — rotation already immerses
 * via the existing landscape-immersive behavior (`isLandscape` →
 * `immersive` in `useLandscapeMode`). In portrait, the button is the only
 * way for the user to enter / exit FS without rotating.
 *
 * Placement: parent canvas frame should be `position: relative` (every
 * current site already is). The toggle absolute-positions itself top-right
 * with z-index above the canvas so it stays tappable inside the canvas
 * rect — survives FS chrome-hide because it is a canvas-frame sibling, not
 * page-level chrome.
 *
 * § 27 — amber accent IS allowed here because the button is interactive
 * (tap toggles immersive state). 44px min touch (TOUCH.minTarget). Single CTA,
 * no chevron, no competing affordance.
 */
export default function FullscreenToggle({ fsActive, onToggle, isLandscape }) {
  if (isLandscape) return null;
  const Icon = fsActive ? Minimize2 : Maximize2;
  const label = fsActive ? 'Exit full-screen' : 'Full-screen';
  return (
    <div
      role="button"
      aria-label={label}
      onClick={onToggle}
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 30,
        width: TOUCH.minTarget, height: TOUCH.minTarget,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: fsActive ? `${COLORS.accent}1f` : 'rgba(0,0,0,0.55)',
        border: `1px solid ${fsActive ? COLORS.accent : COLORS.border}`,
        borderRadius: 10,
        color: fsActive ? COLORS.accent : COLORS.text,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        backdropFilter: 'blur(8px)',
        fontFamily: FONT,
      }}
    >
      <Icon size={20} strokeWidth={2.25} />
    </div>
  );
}
