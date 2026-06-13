// Unit — arc C motion infra (ADDENDUM STEP 10). Pure logic only (no DOM):
// view-transition eligibility + the skeleton anti-flash doctrine.
import { test, expect } from '@playwright/test';
import {
  shouldUseViewTransition,
  withViewTransition,
  skeletonNextVisible,
  SKELETON_SHOW_DELAY,
  SKELETON_MIN_DISPLAY,
} from '../../src/utils/motion.js';

test('shouldUseViewTransition: needs enabled AND supported AND not-reduced-motion', () => {
  // All three required.
  expect(shouldUseViewTransition({ enabled: true,  supported: true,  reducedMotion: false })).toBe(true);
  // Any one missing → false.
  expect(shouldUseViewTransition({ enabled: false, supported: true,  reducedMotion: false })).toBe(false);
  expect(shouldUseViewTransition({ enabled: true,  supported: false, reducedMotion: false })).toBe(false);
  expect(shouldUseViewTransition({ enabled: true,  supported: true,  reducedMotion: true  })).toBe(false);
});

test('shouldUseViewTransition: default flag is OFF (motion infra ships dark)', () => {
  // No args → reads STATIC_FLAGS.ENABLE_MOTION (false) → never eligible,
  // regardless of support. This is the "zero visual surface" guarantee.
  expect(shouldUseViewTransition({ supported: true, reducedMotion: false })).toBe(false);
});

test('withViewTransition: runs fn synchronously and returns null on the no-op path', () => {
  let ran = 0;
  const result = withViewTransition(() => { ran++; }, { enabled: false, supported: true });
  expect(ran).toBe(1);          // fn still executes
  expect(result).toBe(null);    // no ViewTransition started
});

test('withViewTransition: tolerates a non-function arg', () => {
  expect(withViewTransition(undefined)).toBe(null);
});

test('skeleton doctrine: no flash on fast loads, no blink once shown', () => {
  // Loading just started, inside the grace window → stay hidden (no flash).
  expect(skeletonNextVisible({ loading: true, visible: false, msSinceLoadingStart: 100, msSinceShown: 0 })).toBe(false);
  // Loading persisted past SHOW_DELAY → show.
  expect(skeletonNextVisible({ loading: true, visible: false, msSinceLoadingStart: SKELETON_SHOW_DELAY, msSinceShown: 0 })).toBe(true);
  // Already shown + still loading → stay shown.
  expect(skeletonNextVisible({ loading: true, visible: true, msSinceLoadingStart: 9999, msSinceShown: 50 })).toBe(true);
  // Loading ended but min-display not elapsed → stay shown (no blink).
  expect(skeletonNextVisible({ loading: false, visible: true, msSinceLoadingStart: 0, msSinceShown: SKELETON_MIN_DISPLAY - 1 })).toBe(true);
  // Loading ended and min-display elapsed → hide.
  expect(skeletonNextVisible({ loading: false, visible: true, msSinceLoadingStart: 0, msSinceShown: SKELETON_MIN_DISPLAY })).toBe(false);
  // Never loaded, never shown → hidden.
  expect(skeletonNextVisible({ loading: false, visible: false, msSinceLoadingStart: 0, msSinceShown: 0 })).toBe(false);
});

test('skeleton timing constants match the doctrine', () => {
  expect(SKELETON_SHOW_DELAY).toBe(200);
  expect(SKELETON_MIN_DISPLAY).toBe(300);
});
