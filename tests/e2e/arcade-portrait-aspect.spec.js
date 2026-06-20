// e2e — arcade LCD must NOT stretch vertically in portrait/tablet.
//
// Root cause (fixed): the LCD box used height:'100%' + aspectRatio + maxWidth:'100%'.
// When the aspect-derived width exceeded the parent width (portrait/tablet), maxWidth
// clamped the WIDTH while height stayed 100% → the box lost its ratio → the canvas
// (width/height:100%) stretched vertically. Fix: drive by WIDTH (width:'100%' +
// aspectRatio + maxHeight:'100%'), dropping the fixed height:'100%'.
//
// Fail-first: on a tablet-PORTRAIT viewport the rendered canvas ratio is measured
// against the game's intrinsic ratio. Pre-fix the canvas is far taller (clamped width
// × full height) → RED. Post-fix the ratio matches → GREEN. (This IS the instrument:
// it logs box w/h vs intrinsic ratio.)
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT } from './fixtures.js';

const TABLET_PORTRAIT = { width: 820, height: 1180 };

const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

// game id, intrinsic ratio (w/h), route
const GAMES = [
  { id: 'warrior', testid: 'read-warrior-canvas', ratio: 9 / 16, route: '#/break/warrior' },
  { id: 'lander', testid: 'reads-lander-canvas', ratio: 160 / 224, route: '#/break/lander' },
];

test.describe('arcade portrait aspect (no vertical stretch)', () => {
  for (const g of GAMES) {
    test(`${g.id}: canvas keeps its ${g.ratio.toFixed(3)} ratio on tablet portrait`, async ({ page }) => {
      await login(page, SELFEDIT_ACCOUNT);
      await skipOnboarding(page);
      await page.setViewportSize(TABLET_PORTRAIT);
      await page.goto('/' + g.route);

      const canvas = page.getByTestId(g.testid);
      await expect(canvas).toBeVisible({ timeout: 20000 });
      const box = await canvas.boundingBox();
      const rendered = box.width / box.height;
      // INSTRUMENT: surface the measured vs intrinsic ratio in the test log.
      // eslint-disable-next-line no-console
      console.log(`[${g.id}] box ${Math.round(box.width)}x${Math.round(box.height)} ratio=${rendered.toFixed(3)} intrinsic=${g.ratio.toFixed(3)}`);
      // ±4% tolerance (border/scanline px). Pre-fix the box is ~0.39 → fails.
      expect(Math.abs(rendered - g.ratio)).toBeLessThan(0.04);
    });
  }
});
