import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';

/**
 * FullscreenToggle — § 76 Stage 1.
 *
 * Shared portrait-FS trigger for data-canvas surfaces (MatchPage scout,
 * TacticPage, LayoutDetail). Renders NULL in landscape on canvas-primary
 * surfaces — rotation already immerses via the existing landscape-immersive
 * behavior (`isLandscape` → `immersive` in `useLandscapeMode`). On
 * scroll-dashboard surfaces (ScoutedTeam), the caller passes
 * `isLandscape={false}` to force the toggle to render in both orientations
 * (no auto-on-landscape there — entry is explicit per § 81).
 *
 * Placement: parent canvas frame should be `position: relative` (every
 * current site already is). The toggle absolute-positions itself top-right
 * by default; `placement="top-left"` flips it to the left so it doesn't
 * collide with the "✏ Rysuj" chip on ScoutedTeam's expanded heatmap. The
 * top-left variant is also safe-area-aware (the overlay covers viewport
 * including iOS notch / dynamic island; the default top-right has been
 * fine on canvas-frame-bound surfaces and keeps its existing offsets to
 * avoid regressing Stage 1 callers).
 *
 * § 27 — amber accent IS allowed here because the button is interactive
 * (tap toggles immersive state). 44px min touch (TOUCH.minTarget). Single CTA,
 * no chevron, no competing affordance.
 */
export default function FullscreenToggle({ fsActive, onToggle, isLandscape, placement = 'top-right' }) {
  if (isLandscape) return null;
  const Icon = fsActive ? Minimize2 : Maximize2;
  const label = fsActive ? 'Exit full-screen' : 'Full-screen';
  const placementStyle = placement === 'top-left'
    ? {
        top: 'calc(8px + env(safe-area-inset-top, 0px))',
        left: 'calc(8px + env(safe-area-inset-left, 0px))',
      }
    : { top: 8, right: 8 };
  return (
    <div
      role="button"
      aria-label={label}
      onClick={onToggle}
      style={{
        position: 'absolute', ...placementStyle, zIndex: 30,
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
