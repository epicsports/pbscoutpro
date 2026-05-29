// e2e #1 — Concurrent two-coach scouting → end-match merge (THE KEYSTONE).
// Guards the NXL Czechy 2026-05-15 doc-ID corruption class.
//
// Two authenticated browser contexts (coach A = home, coach B = away) log
// points to the SAME match concurrently via the real dataService write path
// (auto-id addPoint + coachUid/reactive-index — the path the corruption fix
// hardened), then one triggers endMatchAndMerge (the coach-vs-coach merge —
// NOT the §70 self-log matcher). Asserts the corruption class is gone:
//   (a) no point loss — all 4 source points survive (2 per coach);
//   (b) no doc-ID collision — 4 distinct auto-ids despite same index 1,2;
//   (c) both coaches' data merged correctly — each canonical has homeData
//       (coach A) AND awayData (coach B).
//
// Merge contract asserted (from dataService.endMatchAndMerge, mapped in
// SCOUTING_CONCURRENCY_AND_CACHE.md § 3.1 — not guessed): group by coachUid,
// index-lockstep pair → canonical `{mid}_merged_NNN` (canonical:true), source
// docs preserved + `mergedInto`, idempotent via match.merged.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TEST_ACCOUNT_2, UID, UID2, TRN, MATCH_CC } from './fixtures.js';

const HOME = ['pa1', 'pa2', 'pa3', 'pa4', 'pa5'];
const AWAY = ['pb1', 'pb2', 'pb3', 'pb4', 'pb5'];

const logHome = (page, uid, outcome, order) => page.evaluate(
  ({ tid, mid, u, oc, ord, roster }) => window.__pbtest.logStreamPoint(tid, mid, u, {
    outcome: oc, status: 'partial', order: ord,
    homeData: { players: roster, scoutedBy: u, fieldSide: 'left' }, teamA: { players: roster },
  }),
  { tid: TRN, mid: MATCH_CC, u: uid, oc: outcome, ord: order, roster: HOME },
);
const logAway = (page, uid, outcome, order) => page.evaluate(
  ({ tid, mid, u, oc, ord, roster }) => window.__pbtest.logStreamPoint(tid, mid, u, {
    outcome: oc, status: 'partial', order: ord,
    awayData: { players: roster, scoutedBy: u, fieldSide: 'right' }, teamB: { players: roster },
  }),
  { tid: TRN, mid: MATCH_CC, u: uid, oc: outcome, ord: order, roster: AWAY },
);

test('#1 concurrent two-coach scouting → end-match merge (no loss / no collision / both reflected)', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  try {
    await login(pageA, TEST_ACCOUNT);
    await login(pageB, TEST_ACCOUNT_2);
    await pageA.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await pageB.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    // Point 1 — both coaches log concurrently (both compute index 1).
    const r1 = await Promise.all([logHome(pageA, UID, 'win_a', 1), logAway(pageB, UID2, 'win_a', 1)]);
    // Point 2 — both log concurrently (index 2).
    const r2 = await Promise.all([logHome(pageA, UID, 'win_b', 2), logAway(pageB, UID2, 'win_b', 2)]);

    expect(r1.concat(r2).every(r => r.id)).toBeTruthy();
    expect(r1[0].index).toBe(1); expect(r1[1].index).toBe(1); // same index, distinct docs
    expect(r2[0].index).toBe(2); expect(r2[1].index).toBe(2);

    // Pre-merge: 4 distinct source docs, no overwrite.
    const before = await pageA.evaluate(({ tid, mid }) => window.__pbtest.getPoints(tid, mid), { tid: TRN, mid: MATCH_CC });
    expect(before.length).toBe(4);
    expect(new Set(before.map(p => p.id)).size).toBe(4); // (b) no doc-ID collision
    expect(before.filter(p => p.coachUid === UID).length).toBe(2);
    expect(before.filter(p => p.coachUid === UID2).length).toBe(2);

    // Trigger the coach-vs-coach merge.
    const result = await pageA.evaluate(({ tid, mid }) => window.__pbtest.endMatchAndMerge(tid, mid), { tid: TRN, mid: MATCH_CC });
    expect(result.merged).toBe(2);

    const after = await pageA.evaluate(({ tid, mid }) => window.__pbtest.getPoints(tid, mid), { tid: TRN, mid: MATCH_CC });
    const source = after.filter(p => p.coachUid);          // original per-coach docs
    const canonical = after.filter(p => p.canonical === true);

    // (a) no point loss — 4 source docs preserved, each merged into a canonical.
    expect(source.length).toBe(4);
    expect(source.every(p => p.mergedInto)).toBeTruthy();
    // 2 canonical merged docs created.
    expect(canonical.length).toBe(2);
    // (c) both coaches' data in each canonical: home (coach A) AND away (coach B).
    for (const c of canonical) {
      expect(c.homeData?.players).toEqual(HOME);
      expect(c.awayData?.players).toEqual(AWAY);
    }
    // canonical outcomes preserved (win_a + win_b across the two points).
    expect(canonical.map(c => c.outcome).sort()).toEqual(['win_a', 'win_b']);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
});
