// e2e — Reads Invaders "Take a Break" 3rd game (§120, fail-first).
// REAL path: drawer → selector (now 3 games) → Invaders row → /break/invaders →
// attract → start → force a PB via the emulator hook → GAME OVER → enter initials
// → SAVE → assert the row PERSISTED at /leaderboards/readsInvaders/scores/{uid}
// (the real submit path, not a stubbed write). Plus the leaderboard rules path via
// the test bridge (create/update + reject-lower + cross-uid denial).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('Reads Invaders', () => {
  test('selector(3 games) → invaders → force PB → SAVE persists via shared mechanism → back', async ({ page }) => {
    test.setTimeout(60000);
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);

    // real drawer entry → selector now lists THREE games (no auto-swap).
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('take-a-break-entry').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
    await expect(page.getByTestId('game-row-snake')).toBeVisible();
    await expect(page.getByTestId('game-row-invaders')).toBeVisible();
    await expect(page.getByTestId('game-row-reads')).toBeVisible();

    // open Invaders → route resolves → attract.
    await page.getByTestId('game-row-invaders').click();
    await expect(page).toHaveURL(/\/break\/invaders/);
    await expect(page.getByTestId('reads-invaders')).toBeVisible();
    await expect(page.getByTestId('reads-invaders-attract')).toBeVisible();

    // start Game A → playing (canvas + D-pad, attract gone).
    await page.getByTestId('reads-invaders-start-a').click();
    await expect(page.getByTestId('reads-invaders-left')).toBeVisible();
    await expect(page.getByTestId('reads-invaders-canvas')).toBeVisible();
    await expect(page.getByTestId('reads-invaders-attract')).toHaveCount(0);

    // force a guaranteed personal best, then game-over (deterministic — gameplay PB is timed/random).
    await page.waitForFunction(() => !!window.__pbInvadersTest, { timeout: 10000 });
    const before = await page.evaluate(() => window.__pbtest.readsInvadersMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 200);
    await page.evaluate((s) => { window.__pbInvadersTest.forceScore(s); window.__pbInvadersTest.gameOver(); }, target);

    // GAME OVER → PB → initials picker → SAVE (the REAL submit path).
    await expect(page.getByTestId('reads-invaders-over')).toBeVisible();
    await expect(page.getByTestId('reads-invaders-initials')).toBeVisible();
    await page.getByTestId('reads-invaders-submit').click();
    await expect(page.getByTestId('reads-invaders-attract')).toBeVisible({ timeout: 15000 });

    // assert PERSISTED via the shared board (initials AAA default).
    const after = await page.evaluate(() => window.__pbtest.readsInvadersMyScore());
    expect(after.score).toBe(target);
    expect(after.initials).toBe('AAA');
    expect(after.mode).toBe('A');

    // back → returns to the selector.
    await page.getByTestId('reads-invaders-back').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
  });

  test('leaderboard write obeys the rules (create/update · reject-lower · cross-uid denied)', async ({ page }) => {
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    const before = await page.evaluate(() => window.__pbtest.readsInvadersMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 150);
    const created = await page.evaluate((s) => window.__pbtest.readsInvadersSubmit('ABC', s, 'B'), target);
    expect(created).toBe(true);
    const after = await page.evaluate(() => window.__pbtest.readsInvadersMyScore());
    expect(after.score).toBe(target);
    expect(after.initials).toBe('ABC');
    expect(after.mode).toBe('B');

    const onBoard = await page.evaluate(async (uid) => {
      const top = await window.__pbtest.readsInvadersTop();
      return top.some((r) => r.uid === uid && r.score >= 1);
    }, after.uid);
    expect(onBoard).toBe(true);

    const lower = await page.evaluate((s) => window.__pbtest.readsInvadersSubmit('ZZZ', s, 'A'), target - 40);
    expect(lower).toBe(false);
    const unchanged = await page.evaluate(() => window.__pbtest.readsInvadersMyScore());
    expect(unchanged.score).toBe(target);

    const denied = await page.evaluate(() =>
      window.__pbtest.readsInvadersRawWriteOther('someone-else-uid', 500)
        .then(() => 'ALLOWED').catch((e) => (e && e.code) || 'DENIED'));
    expect(denied).not.toBe('ALLOWED');
  });
});
