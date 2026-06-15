// Role source-of-truth strand (2026-06-15, Jacek brief): membership + role must
// be INDEPENDENT of profile-linking, and workspace.userRoles must be authoritative
// for workspace ENTRY as well as for the access gate.
//
// Repro of the ranger1996 live data: the user has roles in WS_SPLIT_ROLES.userRoles,
// but users/{uid}.roles is EMPTY, defaultWorkspace is NULL, and linkSkippedAt is set
// (they skipped profile-linking — a first-class, supported state). They are also a
// member of WS_SPLIT_EMPTY (empty roles) whose slug sorts FIRST, so it is docs[0]
// for the members array-contains query the auto-enter falls back to when there is
// no defaultWorkspace.
//
// Fail-first: the OLD auto-enter entered docs[0] (the empty-roles ws) → the gate saw
// userRoles[uid]=[] → PendingApprovalPage (no nav-ball) → RED, even though another
// workspace already held the granted roles. The FIX prefers the workspace where
// userRoles[uid] is non-empty → the app shell (nav-ball) renders with the granted
// role → GREEN. No profile link, no defaultWorkspace, still gets in.
import { test, expect } from '@playwright/test';
import { SPLIT_ACCOUNT } from './fixtures.js';

test('member with granted roles in one ws (empty in another, no default, link skipped) auto-enters the role-bearing ws', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));
  await page.locator('input[type="email"]').fill(SPLIT_ACCOUNT.email);
  await page.locator('input[type="password"]').fill(SPLIT_ACCOUNT.password);
  await page.locator('button[type="submit"]').click();

  // Lands in the app — roles resolved from workspace.userRoles, profile-link
  // skipped, no defaultWorkspace — NOT stranded on the pending-approval gate.
  await expect(page.getByTestId('nav-ball')).toBeVisible({ timeout: 25000 });
  await expect(page.getByTestId('pending-approval')).toHaveCount(0);
});
