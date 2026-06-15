// Durable invite — already-member self-claim (2026-06-15, biuro repro). A user who
// is ALREADY a member of a workspace with EMPTY roles (the old pending-approval
// state) AND has a PENDING email-invite for it must self-claim the invited role on
// login — even though they're already in members[].
//
// Fail-first: the first self-claim rule required `!(uid in members)`, so an
// already-member's claim write was DENIED → they stayed empty-roles →
// PendingApprovalPage (no nav-ball) → RED. This is exactly why biuro
// (member of ranger1996, empty roles, pending invite) never self-claimed. The
// fix allows a claimant with EMPTY current roles (member or not) to gain the role
// → they land in the app (nav-ball) → GREEN.
import { test, expect } from '@playwright/test';
import { PCLAIM_ACCOUNT } from './fixtures.js';

test('already-member with empty roles + pending invite self-claims the role on login', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));
  await page.locator('input[type="email"]').fill(PCLAIM_ACCOUNT.email);
  await page.locator('input[type="password"]').fill(PCLAIM_ACCOUNT.password);
  await page.locator('button[type="submit"]').click();

  // Self-claim grants the coach role → not pending → linkSkippedAt → app shell.
  await expect(page.getByTestId('nav-ball')).toBeVisible({ timeout: 25000 });
  await expect(page.getByTestId('pending-approval')).toHaveCount(0);
});
