// Durable invite — Part 3: admin pending-invites view (manual safety net).
// The workspace admin sees email invites + status (sent / joined) on the Members
// page, so onboarding can never silently hard-block — a sent-but-not-joined
// invite is visible and resendable. Seed has a never-claimed pending email invite
// on ADMIN_WS (super's own workspace).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SUPER_ACCOUNT, ADMIN_WS } from './fixtures.js';

test('admin Members page lists pending email invites', async ({ page }) => {
  await login(page, SUPER_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 }).catch(() => {});
  await page.evaluate(s => window.__pbtest && window.__pbtest.setWorkspace(s), ADMIN_WS).catch(() => {});
  await page.goto('/#/settings/members');

  const section = page.getByTestId('email-invites-section');
  await expect(section).toBeVisible({ timeout: 15000 });
  await expect(section.getByText('adminview@test.local')).toBeVisible();
});
