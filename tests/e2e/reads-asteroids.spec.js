// e2e — Reads Asteroids 6th Arcade game (§123A, fail-first).
// REAL path: drawer → selector → Asteroids row → /break/asteroids → canvas mounts →
// start → force a PB via the emulator hook → GAME OVER → new-best initials → SAVE →
// assert PERSISTED at /leaderboards/readsAsteroids/scores/{uid} via the shared submit
// (NOT another game's board). Plus the leaderboard rules path via the test bridge.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('Reads Asteroids', () => {
  test('selector → asteroids → force PB → SAVE persists under readsAsteroids → back', async ({ page }) => {
    test.setTimeout(60000);
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);

    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('take-a-break-entry').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
    await expect(page.getByTestId('game-row-asteroids')).toBeVisible();

    await page.getByTestId('game-row-asteroids').click();
    await expect(page).toHaveURL(/\/break\/asteroids/);
    await expect(page.getByTestId('reads-asteroids')).toBeVisible();
    await expect(page.getByTestId('reads-asteroids-canvas')).toBeVisible();

    // start (tap the canvas) then force a guaranteed PB + game-over (deterministic).
    await page.getByTestId('reads-asteroids-canvas').click();
    await page.waitForFunction(() => !!window.__pbAsteroidsTest, { timeout: 10000 });
    const before = await page.evaluate(() => window.__pbtest.readsAsteroidsMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 200);
    await page.evaluate((s) => { window.__pbAsteroidsTest.forceScore(s); window.__pbAsteroidsTest.gameOver(); }, target);

    await expect(page.getByTestId('reads-asteroids-initials')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('reads-asteroids-submit').click();

    await expect.poll(() => page.evaluate(() => window.__pbtest.readsAsteroidsMyScore().then(m => m?.score || 0)), { timeout: 8000 }).toBe(target);
    const after = await page.evaluate(() => window.__pbtest.readsAsteroidsMyScore());
    expect(after.initials).toBe('AAA');
    expect(after.mode).toBe('A');

    await page.getByTestId('reads-asteroids-back').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
  });

  test('leaderboard write obeys the rules (create/update · reject-lower · cross-uid denied)', async ({ page }) => {
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    const before = await page.evaluate(() => window.__pbtest.readsAsteroidsMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 170);
    const created = await page.evaluate((s) => window.__pbtest.readsAsteroidsSubmit('ABC', s), target);
    expect(created).toBe(true);
    const after = await page.evaluate(() => window.__pbtest.readsAsteroidsMyScore());
    expect(after.score).toBe(target);
    expect(after.initials).toBe('ABC');

    const onBoard = await page.evaluate(async (uid) => {
      const top = await window.__pbtest.readsAsteroidsTop();
      return top.some((r) => r.uid === uid && r.score >= 1);
    }, after.uid);
    expect(onBoard).toBe(true);

    const lower = await page.evaluate((s) => window.__pbtest.readsAsteroidsSubmit('ZZZ', s), target - 50);
    expect(lower).toBe(false);
    const unchanged = await page.evaluate(() => window.__pbtest.readsAsteroidsMyScore());
    expect(unchanged.score).toBe(target);

    const denied = await page.evaluate(() =>
      window.__pbtest.readsAsteroidsRawWriteOther('someone-else-uid', 500)
        .then(() => 'ALLOWED').catch((e) => (e && e.code) || 'DENIED'));
    expect(denied).not.toBe('ALLOWED');
  });
});
