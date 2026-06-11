// Unit — § 115 intensity ramp. Magnitude is encoded by the ramp (fixed markers),
// so rampColor MUST differ between low and high t (the growing-circle it retires
// had no colour signal). Also checks the gated traffic-light stops + auto-contrast.
import { test, expect } from '@playwright/test';
import { INTENSITY_RAMP, rampColor, rampTextColor } from '../../src/utils/theme.js';

test('intensity ramp: magnitude maps to distinct colours + gated stops', () => {
  // Gated default stops = traffic-light, mid nudged off accent-amber (#facc15).
  expect(INTENSITY_RAMP.default).toEqual(['#22c55e', '#facc15', '#ef4444']);

  const lo = rampColor(0, 'default');
  const mid = rampColor(0.5, 'default');
  const hi = rampColor(1, 'default');
  // Distinct across magnitude (the whole point of the ramp).
  expect(lo).not.toBe(hi);
  expect(lo).not.toBe(mid);
  expect(mid).not.toBe(hi);
  // Endpoints land on the stop colours (green low, red high).
  expect(lo).toBe('rgb(34, 197, 94)');   // #22c55e
  expect(hi).toBe('rgb(239, 68, 68)');   // #ef4444
  // Clamped + safe on garbage input.
  expect(rampColor(-5, 'default')).toBe(lo);
  expect(rampColor(2, 'default')).toBe(hi);
  expect(rampColor(NaN, 'default')).toBe(lo);

  // Colour-blind ramp is a different, luminance-monotonic sequence.
  expect(rampColor(1, 'colorblind')).not.toBe(hi);

  // Auto-contrast: dark text on the LIGHT mid (yellow), white on the dark high end.
  expect(rampTextColor(0.5, 'default')).toBe('#0a0e17'); // #facc15 yellow is light → dark text
  expect(rampTextColor(1, 'default')).toBe('#ffffff');   // #ef4444 red is dark → white text
});
