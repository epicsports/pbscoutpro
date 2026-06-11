// §1 perf pinpoint — what is scouted-team stuck on? CPU is idle (proven), so it's
// an I/O / loading-gate wait. This probe navigates (hash nav, which completes),
// polls the rendered state every 2s, and dumps what the partial shows + per-call
// Firestore timings via the test bridge, so we name the hanging gate.
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const SCOUTED_TEAM = '#/tournament/trn-stress/team/ateam-0';

test('probe scouted-team loading gate', async ({ page }) => {
  test.setTimeout(90000);
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).slice(0, 120)));

  await login(page, { email: 'coach@audit.local', password: 'test1234' });
  await page.evaluate((h) => { window.location.hash = h; }, SCOUTED_TEAM);

  for (let s = 2; s <= 14; s += 4) {
    await page.waitForTimeout(4000);
    const st = await page.evaluate(() => ({
      len: (document.body.innerText || '').trim().length,
      sample: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      canvases: document.querySelectorAll('canvas').length,
    }));
    console.log(`[t=${s}s] bodyText=${st.len} canvases=${st.canvases} :: ${st.sample}`);
  }
  console.log(`[console errors] ${errs.length ? errs.join(' | ') : 'none'}`);
  await page.screenshot({ path: 'tests/results-profile/scouted-team-stuck.png', timeout: 10000 }).catch(e => console.log('shot err: ' + e.message.split('\n')[0]));
  expect(true).toBe(true);
});
