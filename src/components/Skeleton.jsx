import React, { useState, useEffect, useRef } from 'react';
import { COLORS, RADIUS } from '../utils/theme';
import { SKELETON_SHOW_DELAY, SKELETON_MIN_DISPLAY } from '../utils/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * arc C — <Skeleton> loading placeholder (ADDENDUM STEP 10). Implements the
 * anti-flash doctrine via timers around the pure decision in motion.js:
 *   - render NOTHING for the first SKELETON_SHOW_DELAY (200ms) of loading, so a
 *     fast load never flashes a skeleton;
 *   - once shown, stay up at least SKELETON_MIN_DISPLAY (300ms) so it never blinks.
 * Pulses via the existing `pulse` keyframe (global.css); static under
 * prefers-reduced-motion. Styled from tokens. NOT mounted anywhere yet —
 * adopting it on a surface is a flag-on / per-screen decision.
 *
 * Usage: <Skeleton loading={isLoading}>{realContent}</Skeleton>
 */
export default function Skeleton({
  loading,
  children = null,
  width = '100%',
  height = 16,
  radius,
  style,
}) {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    let timer;
    if (loading && !visible) {
      timer = setTimeout(() => { shownAtRef.current = Date.now(); setVisible(true); }, SKELETON_SHOW_DELAY);
    } else if (!loading && visible) {
      const remaining = Math.max(0, SKELETON_MIN_DISPLAY - (Date.now() - shownAtRef.current));
      timer = setTimeout(() => setVisible(false), remaining);
    }
    return () => clearTimeout(timer);
  }, [loading, visible]);

  // Resolved + past the min-display tail → show the real content.
  if (!loading && !visible) return children;
  // Loading but still inside the grace window → nothing (no flash).
  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius ?? RADIUS.md,
        background: COLORS.surfaceLight,
        ...(reduced ? null : { animation: 'pulse 1.4s ease-in-out infinite' }),
        ...style,
      }}
    />
  );
}
