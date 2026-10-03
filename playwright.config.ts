import { defineConfig } from '@playwright/test';

// CHROMIUM_PATH points at a preinstalled browser (CI containers); otherwise Playwright's own download is used.
const executablePath = process.env['CHROMIUM_PATH'] || undefined;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath },
    trace: 'retain-on-failure',
  },
  projects: [
    // The app as a web page (localStorage storage), served from the production build.
    { name: 'web', testMatch: /(web|visual)\.spec\.ts/, use: { baseURL: 'http://localhost:4300' } },
    // The unpacked Manifest V3 extension, with real chrome.storage.
    { name: 'extension', testMatch: 'extension.spec.ts' },
  ],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
  },
});
