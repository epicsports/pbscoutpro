// e2e — player-import pbliId dedup resolver (CC_BRIEF_PLAYER_DEDUP, Item 1).
// Tests the identity-critical decision: when a CSV row has a pbliId but no pbliId
// match, do we CLAIM a lone pbliId-less namesake, FLAG (ambiguous), or CREATE new?
// Pure function (no Firestore) exposed via the bridge — deterministic, no login needed.
import { test, expect } from '@playwright/test';

test.describe('player-import pbliId dedup resolver', () => {
  test('claim a lone pbliId-less namesake; flag ambiguity; create when no namesake', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    const resolve = (name, players) => page.evaluate(
      ({ n, p }) => window.__pbtest.resolvePbliImport(n, p), { n: name, p: players });

    // 0 same-name docs → genuinely new player → create.
    expect(await resolve('New Guy', [{ id: 'x', name: 'Someone Else' }]))
      .toMatchObject({ action: 'create' });

    // exactly 1 same-name doc, pbliId-LESS → OBVIOUS → claim it.
    expect(await resolve('Jan Kowalski', [{ id: 'a', name: 'Jan Kowalski' }]))
      .toMatchObject({ action: 'claim', targetId: 'a' });

    // exactly 1 same-name but it already has a (different) pbliId → AMBIGUOUS → flag.
    expect(await resolve('Jan Kowalski', [{ id: 'a', name: 'Jan Kowalski', pbliId: 'PBL-9' }]))
      .toMatchObject({ action: 'flag' });

    // 2+ same-name docs → AMBIGUOUS → flag (don't guess which).
    const multi = await resolve('Jan Kowalski', [
      { id: 'a', name: 'Jan Kowalski' }, { id: 'b', name: 'Jan Kowalski' }]);
    expect(multi.action).toBe('flag');
    expect(multi.candidateIds.sort()).toEqual(['a', 'b']);

    // Name match is case/whitespace-insensitive (exact normalized first+last).
    expect(await resolve('  jan   KOWALSKI ', [{ id: 'a', name: 'Jan Kowalski' }]))
      .toMatchObject({ action: 'claim', targetId: 'a' });
  });
});
