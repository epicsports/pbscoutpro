// e2e — Reads Mini "Take a Break" (§117, fail-first).
// Exercises the REAL path: drawer entry → /break route → attract → start →
// playing controls → GAME OVER → back; plus the leaderboard WRITE against the
// REAL security rules via the emulator test bridge (create/update + reject-lower
// + cross-uid denial), since reaching a personal best by timed gameplay is
// non-deterministic. A green test that never clicks the real entry is forbidden.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('Reads Mini', () => {
  test('drawer entry → attract → play → game over → back', async ({ page }) => {
    test.setTimeout(60000);   // reaching 3 misses is timed gameplay
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);

    // T1 — real drawer entry → real route.
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('take-a-break-entry').click();
    await expect(page).toHaveURL(/\/break/);
    await expect(page.getByTestId('reads-mini')).toBeVisible();

    // attract overlay shows (title or high-scores phase of the loop).
    await expect(page.getByTestId('reads-mini-attract')).toBeVisible();

    // T2 — start Game A → playing (d-pad appears, attract overlay gone).
    await page.getByTestId('reads-mini-start-a').click();
    await expect(page.getByTestId('reads-mini-left')).toBeVisible();
    await expect(page.getByTestId('reads-mini-score')).toBeVisible();
    await expect(page.getByTestId('reads-mini-attract')).toHaveCount(0);

    // T3 — controls respond (no crash) then let it run to GAME OVER (3 misses).
    await page.getByTestId('reads-mini-left').click();
    await page.getByTestId('reads-mini-right').click();
    await expect(page.getByTestId('reads-mini-over')).toBeVisible({ timeout: 30000 });

    // T4 — from GAME OVER return to attract. Catching ≥1 ball beats the seeded
    // best (0) → initials-entry branch; a 0-score run → Menu branch. Handle both.
    if (await page.getByTestId('reads-mini-initials').isVisible().catch(() => false)) {
      await page.getByTestId('reads-mini-submit').click();
    } else {
      await page.getByTestId('reads-mini-home').click();
    }
    await expect(page.getByTestId('reads-mini-attract')).toBeVisible({ timeout: 15000 });

    // close → leaves the game.
    await page.getByTestId('reads-mini-close').click();
    await expect(page).not.toHaveURL(/\/break/);
  });

  test('leaderboard write obeys the rules (create/update · reject-lower · cross-uid denied)', async ({ page }) => {
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    // T5a — submit a higher score via the REAL submit path → persists.
    const before = await page.evaluate(async () => {
      const m = await window.__pbtest.readsMiniMyScore();
      return m?.score || 0;
    });
    const target = Math.min(9999, before + 137);
    const created = await page.evaluate((s) => window.__pbtest.readsMiniSubmit('ABC', s, 'A'), target);
    expect(created).toBe(true);
    const after = await page.evaluate(() => window.__pbtest.readsMiniMyScore());
    expect(after.score).toBe(target);
    expect(after.initials).toBe('ABC');

    // my row appears on the global board.
    const onBoard = await page.evaluate(async (uid) => {
      const top = await window.__pbtest.readsMiniTop();
      return top.some((r) => r.uid === uid && r.score >= 1);
    }, after.uid);
    expect(onBoard).toBe(true);

    // T5b — a LOWER score is rejected by the client guard (no write).
    const lower = await page.evaluate((s) => window.__pbtest.readsMiniSubmit('ZZZ', s, 'A'), target - 50);
    expect(lower).toBe(false);
    const unchanged = await page.evaluate(() => window.__pbtest.readsMiniMyScore());
    expect(unchanged.score).toBe(target);   // initials/score untouched

    // T5c — writing ANOTHER uid's row must be DENIED by the owner rule.
    const denied = await page.evaluate(() =>
      window.__pbtest.readsMiniRawWriteOther('someone-else-uid', 500)
        .then(() => 'ALLOWED').catch((e) => (e && e.code) || 'DENIED'));
    expect(denied).not.toBe('ALLOWED');
  });
});
