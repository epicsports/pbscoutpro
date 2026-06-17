// e2e — Read Warrior 5th Arcade game (§122, fail-first).
// REAL path: drawer → selector (now FIVE games) → Read Warrior row → /break/warrior
// → canvas mounts → start → force a PB via the emulator hook → GAME OVER → new-best
// initials → SAVE → assert PERSISTED at /leaderboards/readWarrior/scores/{uid} via
// the shared submit (NOT take_a_break / not another game's board). Plus rules path.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('Read Warrior', () => {
  test('selector(5 games) → warrior → force PB → SAVE persists under readWarrior → back', async ({ page }) => {
    test.setTimeout(60000);
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);

    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('take-a-break-entry').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
    // FIVE games total.
    for (const id of ['snake', 'invaders', 'lander', 'warrior', 'reads']) {
      await expect(page.getByTestId(`game-row-${id}`)).toBeVisible();
    }

    await page.getByTestId('game-row-warrior').click();
    await expect(page).toHaveURL(/\/break\/warrior/);
    await expect(page.getByTestId('read-warrior')).toBeVisible();
    await expect(page.getByTestId('read-warrior-canvas')).toBeVisible();

    // start (tap the LCD) then force a guaranteed PB + game-over (deterministic).
    await page.getByTestId('read-warrior-canvas').click();
    await page.waitForFunction(() => !!window.__pbWarriorTest, { timeout: 10000 });
    const before = await page.evaluate(() => window.__pbtest.readWarriorMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 200);
    await page.evaluate((s) => { window.__pbWarriorTest.forceScore(s); window.__pbWarriorTest.gameOver(); }, target);

    await expect(page.getByTestId('read-warrior-initials')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('read-warrior-submit').click();

    await expect.poll(() => page.evaluate(() => window.__pbtest.readWarriorMyScore().then(m => m?.score || 0)), { timeout: 8000 }).toBe(target);
    const after = await page.evaluate(() => window.__pbtest.readWarriorMyScore());
    expect(after.initials).toBe('AAA');
    expect(after.mode).toBe('A');

    await page.getByTestId('read-warrior-back').click();
    await expect(page.getByTestId('take-a-break')).toBeVisible();
  });

  test('leaderboard write obeys the rules (create/update · reject-lower · cross-uid denied)', async ({ page }) => {
    await login(page, SELFEDIT_ACCOUNT);
    await skipOnboarding(page);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

    const before = await page.evaluate(() => window.__pbtest.readWarriorMyScore().then(m => m?.score || 0));
    const target = Math.min(9999, before + 170);
    const created = await page.evaluate((s) => window.__pbtest.readWarriorSubmit('ABC', s), target);
    expect(created).toBe(true);
    const after = await page.evaluate(() => window.__pbtest.readWarriorMyScore());
    expect(after.score).toBe(target);
    expect(after.initials).toBe('ABC');

    const onBoard = await page.evaluate(async (uid) => {
      const top = await window.__pbtest.readWarriorTop();
      return top.some((r) => r.uid === uid && r.score >= 1);
    }, after.uid);
    expect(onBoard).toBe(true);

    const lower = await page.evaluate((s) => window.__pbtest.readWarriorSubmit('ZZZ', s), target - 50);
    expect(lower).toBe(false);
    const unchanged = await page.evaluate(() => window.__pbtest.readWarriorMyScore());
    expect(unchanged.score).toBe(target);

    const denied = await page.evaluate(() =>
      window.__pbtest.readWarriorRawWriteOther('someone-else-uid', 500)
        .then(() => 'ALLOWED').catch((e) => (e && e.code) || 'DENIED'));
    expect(denied).not.toBe('ALLOWED');
  });
});
