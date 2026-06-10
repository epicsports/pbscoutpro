// e2e — auto-enter is non-blocking + throttled (fix/auto-enter-nonblocking).
// An existing member's cold load must render the app from the getDoc READ alone
// and NOT issue a lastAccess write while the workspace's lastAccess is fresh.
//
// FAIL-FIRST: pre-fix, autoEnterDefaultWorkspace AWAITED
//   setDoc({ members: arrayUnion(uid), lastAccess: serverTimestamp() })
// on EVERY cold load, so lastAccess advanced on each load → `t2 === t1` fails.
// Post-fix the existing-member path is read-only + throttled (skip if <24h old),
// so lastAccess is unchanged across two cold loads.
//
// The existing-member path does not branch on role, so this validates the
// non-admin (scout/player) cold-load stall fix too; TEST_ACCOUNT is used because
// it is the stable always-member account (UID_LEAVER is mutated by the leave spec).

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS } from './fixtures.js';

const tabBar = (page) => page.locator('text=/Scout|Coach|Ustawienia|Settings/').first();
const readLastAccessSecs = (page) => page.evaluate(
  (s) => window.__pbtest.readWorkspaceDoc(s).then((d) => d?.lastAccess?.seconds ?? null),
  WS,
);

test.describe('auto-enter: existing-member cold load is read-only + throttled', () => {
  test('renders home without bumping lastAccess across two cold loads (<24h)', async ({ page }) => {
    // 1st cold load — auto-enter renders from the READ; tab bar = render unblocked.
    await login(page, TEST_ACCOUNT);
    await expect(tabBar(page)).toBeVisible();
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.waitForTimeout(1500); // let any (mis)fired fire-and-forget write settle
    const t1 = await readLastAccessSecs(page);
    expect(t1).not.toBeNull(); // seeded fresh Timestamp present

    // 2nd cold load within the throttle window — must NOT write lastAccess.
    await page.reload();
    await expect(tabBar(page)).toBeVisible();
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.waitForTimeout(1500);
    const t2 = await readLastAccessSecs(page);

    // Throttle holds: lastAccess unchanged. (Pre-fix: serverTimestamp bumped each load.)
    expect(t2).toBe(t1);
  });
});
