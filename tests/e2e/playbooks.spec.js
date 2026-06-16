// e2e — Playbooks coach-framed door (CC_BRIEF_PLAYBOOKS). Access already existed
// (coach reaches tactics via the library); this adds the coach-framed ENTRY + a role-
// branded LayoutsPage header. Uses the (re-enabled) view-as to exercise coach/scout
// framing from the single admin account — which also covers the view-as=coach case.
// NOTES: the drawer "Playbooks" SECTION TITLE also reads "Playbooks" → header checks
// are done with the drawer CLOSED (goto /layouts). The drawer trigger (nav-ball) lives
// only on the main page, so drawer ops return to '/' first.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT } from './fixtures.js';

test.describe('Playbooks — coach-framed layout-library door', () => {
  test('admin entry present; admin framing=Layouts; scout excluded; coach framing=Playbooks', async ({ page }) => {
    await login(page, TEST_ACCOUNT); // demo-ws member+admin+coach

    // 1. Admin (canEditTactics) sees the Playbooks drawer entry.
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await expect(page.getByTestId('playbooks-entry')).toBeVisible();
    await page.getByTestId('nav-drawer-scrim').click();

    // 2. Admin framing: the library header is "Layouts/Layouty", NOT "Playbooks".
    await page.goto('/#/layouts');
    await expect(page.getByText('Playbooks', { exact: true })).toHaveCount(0);
    await page.goto('/'); // back to main (nav-ball lives here)

    // 3. view-as = SCOUT → the Playbooks entry disappears (canEditTactics excludes scout).
    await page.getByTestId('nav-ball').click();
    await page.getByTestId('viewas-pill').click();
    await page.getByTestId('viewas-role-scout').click();
    await expect(page.getByTestId('viewas-indicator')).toBeVisible();   // impersonating
    await expect(page.getByTestId('playbooks-entry')).toHaveCount(0);   // drawer re-rendered for scout
    await page.getByTestId('nav-drawer-scrim').click();                 // close drawer
    await page.getByTestId('viewas-exit').click();                      // exit via the floating escape hatch

    // 4. view-as = COACH → entry back; the library header reads "Playbooks".
    await page.getByTestId('nav-ball').click();
    await page.getByTestId('viewas-pill').click();
    await page.getByTestId('viewas-role-coach').click();
    await expect(page.getByTestId('viewas-indicator')).toBeVisible();
    await expect(page.getByTestId('playbooks-entry')).toBeVisible();
    await page.getByTestId('nav-drawer-scrim').click();
    await page.goto('/#/layouts');
    await expect(page.getByText('Playbooks', { exact: true }).first()).toBeVisible();
  });
});
