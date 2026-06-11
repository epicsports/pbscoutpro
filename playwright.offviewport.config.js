import { defineConfig, devices } from '@playwright/test';

// §1 perf pinpoint — reuses the stress-seed emulator webServer but runs only the
// scouted-team CPU-profile spec. Run: JAVA_HOME=… npx playwright test --config playwright.profile.config.js
const EMULATOR_ENV = {
  VITE_USE_EMULATOR: 'true',
  VITE_FIREBASE_PROJECT_ID: 'demo-pbscoutpro',
  VITE_FIREBASE_API_KEY: 'demo-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-pbscoutpro.firebaseapp.com',
  VITE_FIREBASE_APP_ID: 'demo-app',
  GCLOUD_PROJECT: 'demo-pbscoutpro',
};

export default defineConfig({
  testDir: './tests',
  testMatch: /offviewport-probe\.spec\.js/,
  outputDir: './tests/results-offviewport',
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173/', screenshot: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'npx firebase-tools emulators:exec --project demo-pbscoutpro --only auth,firestore ' +
      '"node scripts/audit/seed-stress.cjs && npx vite --port 5173 --strictPort"',
    url: 'http://localhost:5173/',
    timeout: 180000,
    reuseExistingServer: false,
    env: EMULATOR_ENV,
  },
});
