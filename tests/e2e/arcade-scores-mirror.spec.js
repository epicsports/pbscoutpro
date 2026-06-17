// e2e — consolidated arcade-scores account mirror (§122.1, fail-first).
// Each game's submit writes its per-game board AND best-effort mirrors the new
// best into ONE account doc users/{uid}/appState/arcade keyed by board id, so a
// player's bests across all 5 games live in one place. Asserts: (1) a submit
// populates the mirror under the right board key; (2) two DIFFERENT games land
// under DIFFERENT keys in the SAME account doc (consolidated, never colliding);
// (3) the mirror tracks the monotonic best.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test('arcade bests consolidate into one account doc, keyed per game', async ({ page }) => {
  await login(page, SELFEDIT_ACCOUNT);
  await skipOnboarding(page);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

  // Submit higher scores in two different games via the real submit path.
  const snakeBefore = await page.evaluate(() => window.__pbtest.readsSnakeMyScore().then(m => m?.score || 0));
  const warriorBefore = await page.evaluate(() => window.__pbtest.readWarriorMyScore().then(m => m?.score || 0));
  const snakeTarget = Math.min(9999, snakeBefore + 110);
  const warriorTarget = Math.min(9999, warriorBefore + 130);
  expect(await page.evaluate((s) => window.__pbtest.readsSnakeSubmit('AAA', s), snakeTarget)).toBe(true);
  expect(await page.evaluate((s) => window.__pbtest.readWarriorSubmit('BBB', s), warriorTarget)).toBe(true);

  // Both land in ONE account doc, under their own board keys (consolidated).
  const bests = await page.evaluate(() => window.__pbtest.arcadeBests());
  expect(bests.readsSnake?.score).toBe(snakeTarget);
  expect(bests.readWarrior?.score).toBe(warriorTarget);
  expect(bests.readWarrior?.initials).toBe('BBB');

  // Mirror is monotonic: a lower re-submit doesn't lower the mirrored best.
  await page.evaluate((s) => window.__pbtest.readsSnakeSubmit('ZZZ', s), snakeTarget - 40);
  const after = await page.evaluate(() => window.__pbtest.arcadeBests());
  expect(after.readsSnake?.score).toBe(snakeTarget);
});
