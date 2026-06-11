// §2 verification — identify the off-viewport elements. §2a: one shared component
// produces identical off-right numbers across main-home/training/admin-* → is it
// deliberately off-canvas (drawer/menu ⇒ false-positive) or real spill? §2b: the
// canvas toolbar spill on portrait (layout-detail/ballistics/match-scout).
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth.js';

const ROUTES = {
  'admin-leagues': '#/admin/leagues',     // §2a cluster sample
  'layout-detail': '#/layouts/lay-stress', // §2b canvas spill sample
};

test('dump off-viewport elements', async ({ page }) => {
  test.setTimeout(90000);
  await login(page, { email: 'coach@audit.local', password: 'test1234' });
  await page.setViewportSize({ width: 390, height: 844 }); // phone-portrait (worst: +2057)

  const DUMP = () => {
    const vw = window.innerWidth, tol = 2;
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (cs.position !== 'fixed' && r.right > vw + tol) {
        out.push({
          tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 32),
          right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width),
          pos: cs.position, tf: cs.transform === 'none' ? '-' : 'Y', ovfx: cs.overflowX,
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26),
        });
      }
    }
    return { n: out.length, top: out.sort((a, b) => b.right - a.right).slice(0, 8) };
  };
  for (const [name, hash] of Object.entries(ROUTES)) {
    // AUDIT-FAITHFUL: about:blank → full reload to the route (not hash nav).
    await page.goto('about:blank');
    await page.goto('./' + hash, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    try { await page.waitForFunction(() => document.body.innerText.trim().length > 40 || document.querySelector('canvas'), { timeout: 15000 }); } catch {}
    await page.waitForTimeout(600); // audit's settle window
    const at600 = await page.evaluate(DUMP);
    await page.waitForTimeout(2400); // total ~3s
    const at3s = await page.evaluate(DUMP);
    console.log(`\n=== ${name} (${hash}) vw=390 :: offRight @600ms=${at600.n}  @3s=${at3s.n} ===`);
    for (const e of at600.top) console.log(`  @600 <${e.tag}> L=${e.left} R=${e.right} w=${e.w} pos=${e.pos} tf=${e.tf} ovfx=${e.ovfx} cls="${e.cls}" :: "${e.text}"`);
  }
  expect(true).toBe(true);
});
