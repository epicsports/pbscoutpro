// Admin pagination — regression coverage for the class that crashed on prod
// (AdminPlayersPage "Strona undefined z undefined" / o('admin_teams_page_n_of_m')
// is not a function). That render path is gated on totalPages > 1, which the
// 15-player e2e seed never reached (same coverage gap as the Quick-log crash) —
// so the seed now carries 40 padding players (55 global → 2 pages at PAGE_SIZE 50).
//
// The shape-mismatch CRASH class is now caught statically by scripts/lint-i18n-shapes.js;
// this spec is the runtime belt-and-suspenders: the pager must render real numbers
// (never "undefined", never a crash) and next/prev must navigate. AdminTeamsPage
// shares the identical pagination code path + i18n key, so one players spec covers
// the class.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SUPER_ACCOUNT, ADMIN_WS } from './fixtures.js';

// PL is DEFAULT_LANG, so the app renders "Strona N z M"; accept EN too for safety.
const PAGER = /^(Strona \d+ z \d+|Page \d+ of \d+)$/;

test('AdminPlayersPage pager renders real numbers and navigates (no crash/undefined)', async ({ page }) => {
  await login(page, SUPER_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 }).catch(() => {});
  await page.evaluate(s => window.__pbtest && window.__pbtest.setWorkspace(s), ADMIN_WS).catch(() => {});
  await page.goto('/#/admin/players');

  // Pager shows page 1 of 2 — real integers, NOT "undefined", NOT a thrown render.
  const pager = page.getByText(PAGER);
  await expect(pager).toBeVisible({ timeout: 15000 });
  await expect(pager).toContainText(/1.*2/);
  await expect(pager).not.toContainText(/undefined/);

  // Next → page 2.
  await page.getByRole('button', { name: /Następna →|Next →/ }).click();
  await expect(pager).toContainText(/2.*2/);
  await expect(pager).not.toContainText(/undefined/);

  // Prev → back to page 1.
  await page.getByRole('button', { name: /← Poprzednia|← Prev/ }).click();
  await expect(pager).toContainText(/1.*2/);
});
