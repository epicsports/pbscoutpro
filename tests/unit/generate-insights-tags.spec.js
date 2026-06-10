// Unit: computeCalloutZoneTargets must survive a malformed point (a single bad
// doc must never crash ScoutedTeamPage). Regression for the wave-2 crash:
//   TypeError: (tags[i] || []).forEach is not a function @ generateInsights.js:953
// when zoneShots[slot] is a non-array (e.g. {zoneId,kill}) instead of a string[].
// Fail-first: RED on the pre-guard code (throws), GREEN after the Array.isArray guard.
import { test, expect } from '@playwright/test';
import { computeCalloutZoneTargets } from '../../src/utils/generateInsights.js';

test('computeCalloutZoneTargets: non-array zoneShots slot does not crash; valid slots still count', () => {
  const field = { bunkers: [{ id: 'b1', x: 0.5, y: 0.5, positionName: 'Center' }] };
  const badPoint = {
    // slot 0 = the crash shape (object, not array); slot 1 = the real shape (string[]).
    zoneShots: { 0: { zoneId: 'z1', kill: true }, 1: ['z2'] },
    players: [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.4 }],
    assignments: ['p1', 'p2'],
    timeline: [],
  };
  let result, threw = null;
  try { result = computeCalloutZoneTargets([badPoint], field); }
  catch (e) { threw = e; }
  expect(threw, threw && String(threw.message)).toBeNull();      // must not throw
  expect(result && result.break).toBeTruthy();
  expect(result.break.z2 && result.break.z2.count).toBe(1);      // valid array tag counted
  expect(result.break.z1).toBeUndefined();                       // malformed slot skipped
});
