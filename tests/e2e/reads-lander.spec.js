// e2e — Reads Lunar Lander 4th Arcade game (§121, fail-first).
// REAL path: drawer → selector → Lander row → /break/lander → canvas mounts →
// force a PB via the emulator hook → GAME OVER → new-best initials → SAVE →
// assert the row PERSISTED at /leaderboards/readsLander/scores/{uid} via the
// shared submit. Plus the leaderboard rules path via the test bridge.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('Reads Lunar Lander', () => {
  test('selector → lander → force PB → SAVE persists via shared mechanism → back', async ({ page }) => {
    test.setTimeout(60000);
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);

    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('take-a-break-entry').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
    await page.getByTestId('game-row-lander').click();
    await expect(page).toHaveURL(/\/break\/lander/);
    await expect(page.getByTestId('reads-lander')).toBeVisible();
    await expect(page.getByTestId('reads-lander-canvas')).toBeVisible();

    // force a guaranteed personal best, then game-over (deterministic).
    await page.waitForFunction(() => !!window.__pbLanderTest, { timeout: 10000 });
    const before = await page.evaluate(() => window.__pbtest.readsLanderMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 200);
    await page.evaluate((s) => { window.__pbLanderTest.forceScore(s); window.__pbLanderTest.gameOver(); }, target);

    // new-best initials overlay (the leaderboard needs [A-Z]{3}) → SAVE (real submit).
    await expect(page.getByTestId('reads-lander-initials')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('reads-lander-submit').click();

    // PERSISTED via the shared board (initials AAA default).
    await expect.poll(() => page.evaluate(() => window.__pbtest.readsLanderMyScore().then(m => m?.score || 0)), { timeout: 8000 }).toBe(target);
    const after = await page.evaluate(() => window.__pbtest.readsLanderMyScore());
    expect(after.initials).toBe('AAA');
    expect(after.mode).toBe('A');

    // back → returns to the selector.
    await page.getByTestId('reads-lander-back').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
  });

  test('leaderboard write obeys the rules (create/update · reject-lower · cross-uid denied)', async ({ page }) => {
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    const before = await page.evaluate(() => window.__pbtest.readsLanderMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 160);
    const created = await page.evaluate((s) => window.__pbtest.readsLanderSubmit('ABC', s), target);
    expect(created).toBe(true);
    const after = await page.evaluate(() => window.__pbtest.readsLanderMyScore());
    expect(after.score).toBe(target);
    expect(after.initials).toBe('ABC');

    const onBoard = await page.evaluate(async (uid) => {
      const top = await window.__pbtest.readsLanderTop();
      return top.some((r) => r.uid === uid && r.score >= 1);
    }, after.uid);
    expect(onBoard).toBe(true);

    const lower = await page.evaluate((s) => window.__pbtest.readsLanderSubmit('ZZZ', s), target - 50);
    expect(lower).toBe(false);
    const unchanged = await page.evaluate(() => window.__pbtest.readsLanderMyScore());
    expect(unchanged.score).toBe(target);

    const denied = await page.evaluate(() =>
      window.__pbtest.readsLanderRawWriteOther('someone-else-uid', 500)
        .then(() => 'ALLOWED').catch((e) => (e && e.code) || 'DENIED'));
    expect(denied).not.toBe('ALLOWED');
  });
});
