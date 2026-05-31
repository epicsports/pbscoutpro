// e2e STAGE 4 — § 96 layout globalization (global base + workspace overlay).
// Exercises the REAL firestore.rules in the emulator via the test bridge:
//   • global /layouts/{id}  — read = any authed user; write = super_admin only.
//   • /workspaces/{slug}/layoutOverlays/{id} — read/write = isMember/isCoach.
//   • merge contract — overlay.baseLayoutId joins to the base id.

import { test, expect } from '@playwright/test';
import { TEST_ACCOUNT, NEWCOMER_1, SUPER_ACCOUNT, BASE_LAYOUT, WS } from './fixtures.js';

async function bridgeSignIn(page, acct) {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
  await page.evaluate(({ e, p }) => window.__pbtest.signIn(e, p), { e: acct.email, p: acct.password });
}
const okOrDenied = (page, body, arg) => page.evaluate(body, arg).then(() => 'OK').catch(() => 'DENIED');

test.describe('STAGE 4 — § 96 layout globalization', () => {
  test('global base: read = any authed user; write = super_admin only', async ({ browser }) => {
    // A coach (member) can READ the base but NOT write it.
    const ctxC = await browser.newContext();
    const pageC = await ctxC.newPage();
    try {
      await bridgeSignIn(pageC, TEST_ACCOUNT);
      const base = await pageC.evaluate(id => window.__pbtest.readBaseLayout(id), BASE_LAYOUT);
      expect(base).not.toBeNull();
      expect(Array.isArray(base.bunkers)).toBe(true);     // base carries geometry
      expect('zones' in base).toBe(false);                // zones are NOT on the base
      expect(await okOrDenied(pageC, id => window.__pbtest.writeBaseLayout(id, { bunkers: [] }), BASE_LAYOUT)).toBe('DENIED');
    } finally { await ctxC.close(); }

    // An outsider (authed, non-member) can still READ the base (library is browsable).
    const ctxN = await browser.newContext();
    const pageN = await ctxN.newPage();
    try {
      await bridgeSignIn(pageN, NEWCOMER_1);
      const base = await pageN.evaluate(id => window.__pbtest.readBaseLayout(id), BASE_LAYOUT);
      expect(base).not.toBeNull();
    } finally { await ctxN.close(); }

    // A super_admin CAN write the base.
    const ctxS = await browser.newContext();
    const pageS = await ctxS.newPage();
    try {
      await bridgeSignIn(pageS, SUPER_ACCOUNT);
      expect(await okOrDenied(pageS, id => window.__pbtest.writeBaseLayout(id, { doritoSide: 'top' }), BASE_LAYOUT)).toBe('OK');
    } finally { await ctxS.close(); }
  });

  test('overlay: member reads/writes; non-member denied; merge contract holds', async ({ browser }) => {
    // Member coach: reads the overlay, can write zones, and the join key holds.
    const ctxC = await browser.newContext();
    const pageC = await ctxC.newPage();
    try {
      await bridgeSignIn(pageC, TEST_ACCOUNT);
      const ov = await pageC.evaluate(a => window.__pbtest.readOverlay(a.s, a.id), { s: WS, id: BASE_LAYOUT });
      expect(ov).not.toBeNull();
      expect(ov.baseLayoutId).toBe(BASE_LAYOUT);          // merge join key == base id
      expect(Array.isArray(ov.zones)).toBe(true);         // overlay carries zones
      expect(await okOrDenied(pageC, a => window.__pbtest.writeOverlay(a.s, a.id, { nameOverride: 'My name' }), { s: WS, id: BASE_LAYOUT })).toBe('OK');
    } finally { await ctxC.close(); }

    // Non-member outsider: cannot read or write another workspace's overlay.
    const ctxN = await browser.newContext();
    const pageN = await ctxN.newPage();
    try {
      await bridgeSignIn(pageN, NEWCOMER_1);
      expect(await okOrDenied(pageN, a => window.__pbtest.readOverlay(a.s, a.id), { s: WS, id: BASE_LAYOUT })).toBe('DENIED');
      expect(await okOrDenied(pageN, a => window.__pbtest.writeOverlay(a.s, a.id, { nameOverride: 'x' }), { s: WS, id: BASE_LAYOUT })).toBe('DENIED');
    } finally { await ctxN.close(); }
  });
});
