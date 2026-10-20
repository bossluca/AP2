import { defineConfig, devices } from '@playwright/test';

/**
 * Browser-E2E-Tests für die Kernabläufe (rein Frontend, ohne Backend).
 * Läuft gegen den Produktions-Build (`vite preview`). Lokal: `npm run e2e`.
 * In Sandboxes mit vorinstalliertem Chromium den Pfad per
 * `PW_CHROMIUM_PATH` setzen, statt Browser herunterzuladen.
 */
const PORT = 4321;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...(process.env.PW_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // vite preview proxyt /api ohne Backend → ECONNREFUSED-Rauschen ausblenden.
    stderr: 'ignore',
    timeout: 120_000,
  },
});
