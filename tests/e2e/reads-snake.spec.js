// e2e — Reads Snake "Take a Break" 2nd game (§119, fail-first).
// Exercises the REAL path: drawer entry → game selector → Snake row → /break/snake
// → attract → start → deterministic EAT (emulator hook) → wall death → HIGH SCORES;
// plus the leaderboard WRITE against the REAL security rules via the test bridge
// (create/update + reject-lower + cross-uid denial). A green test that never opens
// the real entry is forbidden.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('Reads Snake', () => {
  test('selector → snake → attract → eat grows+scores → wall death → high scores → back', async ({ page }) => {
    test.setTimeout(60000);
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);

    // T5 — real drawer entry → game selector → Snake row → real route.
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('take-a-break-entry').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
    await page.getByTestId('game-row-snake').click();
    await expect(page).toHaveURL(/\/break\/snake/);
    await expect(page.getByTestId('reads-snake')).toBeVisible();
    await expect(page.getByTestId('reads-snake-attract')).toBeVisible();

    // start → playing (d-pad appears, attract gone).
    await page.getByTestId('reads-snake-start').click();
    await expect(page.getByTestId('reads-snake-up')).toBeVisible();
    await expect(page.getByTestId('reads-snake-attract')).toHaveCount(0);

    // T1 — eating food grows the snake + scores +10. Deterministic via the
    // emulator hook: place food directly ahead of the head; the next real tick eats it.
    await page.waitForFunction(() => !!window.__pbSnakeTest, { timeout: 10000 });
    const before = await page.evaluate(() => window.__pbSnakeTest.state());
    expect(before.length).toBe(4);
    expect(before.score).toBe(0);
    await page.evaluate(() => window.__pbSnakeTest.feed());
    await expect.poll(() => page.evaluate(() => window.__pbSnakeTest.state().score), { timeout: 5000 }).toBeGreaterThanOrEqual(10);
    const afterEat = await page.evaluate(() => window.__pbSnakeTest.state());
    expect(afterEat.score % 10).toBe(0);                 // scores arrive in +10 increments
    expect(afterEat.length).toBeGreaterThanOrEqual(5);   // ate ≥1 food → grew

    // T2 — no turning input → the snake runs straight into the right wall → GAME OVER.
    await expect(page.getByTestId('reads-snake-over')).toBeVisible({ timeout: 20000 });

    // T4 — back to attract (score>0 → personal-best → initials; else Menu). Then the
    // attract loop cycles HIGH SCORES into view (top rows ordered desc).
    if (await page.getByTestId('reads-snake-initials').isVisible().catch(() => false)) {
      await page.getByTestId('reads-snake-submit').click();
    } else {
      await page.getByTestId('reads-snake-home').click();
    }
    await expect(page.getByTestId('reads-snake-attract')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('reads-snake-scores')).toBeVisible({ timeout: 8000 });

    // back → returns to the game selector.
    await page.getByTestId('reads-snake-back').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
  });

  test('leaderboard write obeys the rules (create/update · reject-lower · cross-uid denied)', async ({ page }) => {
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    // T3a — submit a higher score via the REAL submit path → persists on readsSnake.
    const before = await page.evaluate(async () => {
      const m = await window.__pbtest.readsSnakeMyScore();
      return m?.score || 0;
    });
    const target = Math.min(9999, before + 120);
    const created = await page.evaluate((s) => window.__pbtest.readsSnakeSubmit('ABC', s), target);
    expect(created).toBe(true);
    const after = await page.evaluate(() => window.__pbtest.readsSnakeMyScore());
    expect(after.score).toBe(target);
    expect(after.initials).toBe('ABC');

    // my row appears on the global Snake board.
    const onBoard = await page.evaluate(async (uid) => {
      const top = await window.__pbtest.readsSnakeTop();
      return top.some((r) => r.uid === uid && r.score >= 1);
    }, after.uid);
    expect(onBoard).toBe(true);

    // T3b — a LOWER score is rejected by the client guard (no write).
    const lower = await page.evaluate((s) => window.__pbtest.readsSnakeSubmit('ZZZ', s), target - 40);
    expect(lower).toBe(false);
    const unchanged = await page.evaluate(() => window.__pbtest.readsSnakeMyScore());
    expect(unchanged.score).toBe(target);

    // T3c — writing ANOTHER uid's row must be DENIED by the owner rule.
    const denied = await page.evaluate(() =>
      window.__pbtest.readsSnakeRawWriteOther('someone-else-uid', 500)
        .then(() => 'ALLOWED').catch((e) => (e && e.code) || 'DENIED'));
    expect(denied).not.toBe('ALLOWED');
  });
});
