/**
 * arc C — motion infrastructure (ADDENDUM STEP 10). Flag-gated, default OFF.
 *
 * Pure logic split out from the React bindings so it's unit-testable without a
 * DOM (the unit harness runs in a Node worker). The hook + <Skeleton> are thin
 * wrappers around these.
 */
import { STATIC_FLAGS } from './featureFlags';

// ── View Transitions ────────────────────────────────────────────────────────

/** Does this environment support the View Transitions API? */
export function supportsViewTransitions() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

/**
 * Pure eligibility decision (testable): wrap a DOM update in a view transition
 * only when motion is enabled, the user hasn't asked to reduce motion, and the
 * browser supports it. Pass `supported` explicitly in tests.
 */
export function shouldUseViewTransition({
  enabled = STATIC_FLAGS.ENABLE_MOTION,
  reducedMotion = false,
  supported,
} = {}) {
  const sup = supported === undefined ? supportsViewTransitions() : supported;
  return !!(enabled && !reducedMotion && sup);
}

/**
 * Run `fn` (a synchronous DOM-mutating callback) inside a View Transition when
 * eligible; otherwise run it directly — a transparent no-op wrapper. Returns the
 * ViewTransition when one was started, else null. With ENABLE_MOTION off this is
 * always the synchronous path, so behaviour is identical to calling fn() directly.
 */
export function withViewTransition(fn, opts = {}) {
  if (typeof fn !== 'function') return null;
  if (shouldUseViewTransition(opts)) {
    return document.startViewTransition(fn);
  }
  fn();
  return null;
}

// ── Skeleton timing doctrine ─────────────────────────────────────────────────
// Don't flash: show a skeleton only if loading persists past SHOW_DELAY; once
// shown, hold it at least MIN_DISPLAY so it never blinks. Pure decision below;
// the <Skeleton> component drives it with timers.
export const SKELETON_SHOW_DELAY = 200;   // ms of continuous loading before showing
export const SKELETON_MIN_DISPLAY = 300;  // ms a shown skeleton must stay up

/**
 * Pure next-visible decision for the skeleton state machine (testable):
 *   - while loading: become/stay visible once we've waited SHOW_DELAY
 *   - after loading ends: stay visible until MIN_DISPLAY has elapsed since shown
 */
export function skeletonNextVisible({ loading, visible, msSinceLoadingStart, msSinceShown }) {
  if (loading) return visible || msSinceLoadingStart >= SKELETON_SHOW_DELAY;
  if (visible) return msSinceShown < SKELETON_MIN_DISPLAY;
  return false;
}
