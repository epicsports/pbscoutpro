// _render-scout — REUSABLE render-verify harness for the SCOUT EDITOR screen.
//
// WHY THIS EXISTS
// Prior throwaway render checks used `npm run dev` + a fresh (UNauthenticated)
// browser. The app boots to the LOGIN screen, so every "render-verify"
// screenshot was actually the login form — hollow proof. This spec runs under
// the EMULATOR Playwright config, which seeds auth + fixtures exactly like the
// real e2e suite, and reuses the SAME auth + nav path that
// `matchpage-modes.spec.js` already uses to reach the scout editor. It then
// SELF-ASSERTS it landed on the real editor (URL `scout=` + a known editor
// element + NO login form) so a login-stall can never pass silently again.
//
// NOT A GATE SPEC. The title is tagged `render-verify`, which `npm run test:e2e`
// excludes via `--grep-invert "pixel-diff|model C|render-verify"`. Run it
// explicitly (see tests/e2e/README-render.md):
//   npx playwright test --config playwright.emulator.config.js _render-scout
//
// Screenshots land in data-export/render/scout-<width>.png (gitignored).

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, WS, matchModesScoutUrl } from './fixtures.js';

const OUT_DIR = path.resolve('data-export/render');

// Widths to capture. The ~1000×720 case is the immersive-triggering
// tablet-landscape: useDevice maps w<1024 → 'tablet' and w>h → landscape, which
// forces MatchPage's `immersive` rail (SideSwapStrip + StageSwitcher + RosterGrid
// + Save in a fixed left rail). 390 = phone portrait, 834 = iPad portrait,
// 1280 = desktop.
const CASES = [
  { width: 390, height: 844, label: 'phone-portrait' },
  { width: 834, height: 1112, label: 'tablet-portrait' },
  { width: 1280, height: 800, label: 'desktop' },
  { width: 1000, height: 720, label: 'tablet-landscape-immersive' },
];

test.describe('render-verify — scout editor (seeded, NOT a gate spec)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Pin the UI locale to English BEFORE the app mounts. The app defaults to
    // Polish (LanguageProvider reads localStorage['pbscoutpro_lang'] once at
    // mount, fallback 'pl'); addInitScript runs before any page script on every
    // navigation, so the whole editor renders in English and the English-label
    // assertions below hold across every width — including the immersive rail,
    // whose Save button is localized (t('quicklog_save_point') = "Zapisz punkt"
    // in PL). Pure test setup — no app/src change.
    await page.addInitScript(() => localStorage.setItem('pbscoutpro_lang', 'en'));

    // Same auth + workspace bootstrap as matchpage-modes.spec.js.
    await login(page, TEST_ACCOUNT);
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), WS);
  });

  for (const { width, height, label } of CASES) {
    test(`render-verify scout editor @ ${width}×${height} (${label})`, async ({ page }) => {
      // Set viewport BEFORE navigating so useDevice resolves the right device
      // class on first mount (immersive depends on width at render time).
      await page.setViewportSize({ width, height });

      // Same nav target matchpage-modes uses to reach the scout editor:
      // mat-modes (isolated seeded match) with ?scout=team-a&mode=new.
      await page.goto('/' + matchModesScoutUrl);

      // Wait for the field + a scout-editor-only control to render. The Save
      // button text ("Select winner to save" / "Save point") renders ONLY in
      // the scout editor (both portrait and immersive rails), so it is the
      // definitive "this is the editor" signal.
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20000 });
      const saveCta = page.getByText(/Select winner to save|Save point/i).first();
      await expect(saveCta).toBeVisible({ timeout: 20000 });

      // ─── SELF-ASSERT: real screen, not login ───
      // 1) URL carries the scout side param.
      expect(page.url()).toContain('scout=');
      // 2) The login form is NOT present (the login-stall trap).
      await expect(page.locator('input[type="email"]')).toHaveCount(0);
      // 3) A second, structural editor marker beyond the Save CTA: the field
      //    canvas (asserted above) + the phase StageSwitcher segments. Break /
      //    Settle / Mid only exist in the scout capture spine.
      const stageSpine = page.getByText(/Break|Settle|Mid/i).first();
      await expect(stageSpine).toBeVisible({ timeout: 10000 });

      // Capture.
      const file = path.join(OUT_DIR, `scout-${width}.png`);
      await page.screenshot({ path: file, fullPage: false });
      // Surface the path in the test log for the operator.
      // eslint-disable-next-line no-console
      console.log(`[render-verify] ${label} → ${file}`);
    });
  }
});
