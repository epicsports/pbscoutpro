// Shared Arcade control button — UNIFORM across all "Take a Break" games
// (Snake · Invaders · Lunar Lander · Read Warrior · Reads Mini). Jacek: buttons
// must be consistent between games; placement/size stays per-game (via `style`).
//
// Fixes (cross-game smoke, 2026-06-18):
//  - text-selection / callout while pressing → NO_SELECT (user-select + callout +
//    tap-highlight all off; touch-action:none so a hold-drag never selects/scrolls).
//  - one consistent press treatment (amber glow + sink) for every game.
//
// Two modes:
//  - hold:  pointer-down → onPress, pointer-up/leave/cancel → onRelease (D-pad,
//           GAS, THRUST, rotate). Use for press-and-hold controls.
//  - tap:   onTap on click (START, SAVE, Game A/B, Retry/Menu).
import React, { useState } from 'react';
import { COLORS, FONT, RADIUS } from '../../utils/theme';

// Reusable "never select / never scroll / never highlight" fragment — spread onto
// any in-game interactive element (buttons AND the game root) so a hold never
// grabs text. Exported so game roots/canvases can use it too.
export const NO_SELECT = {
  userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none',
  WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent', touchAction: 'none',
};

// Uniform base style for ALL arcade control buttons — spread this into a game's
// button + add per-game size/placement (flex/width/height). Keeps the LOOK
// consistent across games while letting layout differ per game.
export const ARCADE_BTN = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  background: COLORS.surface, color: COLORS.accent, border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.lg, cursor: 'pointer', fontFamily: FONT, fontWeight: 800,
  transition: 'transform .05s ease, background .08s ease, border-color .08s ease, box-shadow .08s ease',
  ...NO_SELECT,
};
const base = ARCADE_BTN;
const heldStyle = {
  transform: 'translateY(1px)', background: COLORS.surfaceLight || COLORS.surfaceBar,
  borderColor: COLORS.accent, boxShadow: `inset 0 0 14px ${COLORS.accent}40`, color: COLORS.accent,
};

export default function ArcadeButton({ children, onPress, onRelease, onTap, testId, ariaLabel, style, disabled }) {
  const [held, setHeld] = useState(false);
  const down = (e) => { e.preventDefault(); if (disabled) return; setHeld(true); onPress && onPress(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} };
  const up = () => { if (!held) return; setHeld(false); onRelease && onRelease(); };
  return (
    <button type="button" data-testid={testId} aria-label={ariaLabel} disabled={disabled}
      onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
      onClick={onTap} onContextMenu={(e) => e.preventDefault()}
      style={{ ...base, ...(held ? heldStyle : null), ...(disabled ? { opacity: 0.5, cursor: 'default' } : null), ...style }}>
      {children}
    </button>
  );
}
