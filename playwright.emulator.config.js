import { defineConfig, devices } from '@playwright/test';

// Emulator e2e suite — isolated from prod. The webServer boots the Firebase
// emulator suite (auth + firestore), seeds a deterministic fixture, then starts
// Vite with VITE_USE_EMULATOR=true so the app talks to the emulator instead of
// prod. Requires the `firebase` CLI + a JRE (the Firestore emulator needs Java;
// GitHub Actions runners have it, `firebase` auto-downloads the emulator jars).
//
// Run: npm run test:e2e   (or: npx playwright test --config playwright.emulator.config.js)

const EMULATOR_ENV = {
  VITE_USE_EMULATOR: 'true',
  VITE_FIREBASE_PROJECT_ID: 'demo-pbscoutpro',
  VITE_FIREBASE_API_KEY: 'demo-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-pbscoutpro.firebaseapp.com',
  VITE_FIREBASE_APP_ID: 'demo-app',
  GCLOUD_PROJECT: 'demo-pbscoutpro',
};

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/results-e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false, // single seeded workspace — keep runs serial/deterministic
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html', { outputFolder: 'tests/report-e2e', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173/',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // emulators:exec brings up auth+firestore (exporting *_EMULATOR_HOST to the
    // child), runs the seed, then starts Vite. Vite stays up for the test run;
    // when Playwright tears it down, emulators:exec shuts the emulators.
    command:
      'npx firebase-tools emulators:exec --project demo-pbscoutpro --only auth,firestore ' +
      '"node scripts/test/seed-emulator.cjs && npx vite --port 5173 --strictPort"',
    url: 'http://localhost:5173/',
    timeout: 180000, // first CI run downloads the emulator jars
    reuseExistingServer: !process.env.CI,
    env: EMULATOR_ENV,
  },
});
