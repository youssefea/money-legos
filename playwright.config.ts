import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4180);
const E2E_ROOT = process.env.E2E_ROOT ?? "/tmp/money-legos-e2e";

/**
 * End-to-end tests against the static export (out/), served by e2e/serve.mjs.
 * `npx playwright test` builds first; set E2E_SKIP_BUILD=1 to reuse an existing out/.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  // Chromium always; WebKit too with E2E_WEBKIT=1 (needs `npx playwright install webkit`).
  projects: [
    { name: "chromium" },
    ...(process.env.E2E_WEBKIT ? [{ name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } }] : []),
  ],
  webServer: {
    // Serve a private copy so another build writing to out/ cannot change the app mid-run.
    command: process.env.E2E_SKIP_BUILD
      ? `node e2e/serve.mjs`
      : `npm run build && rm -rf ${E2E_ROOT} && cp -R out ${E2E_ROOT} && node e2e/serve.mjs`,
    url: `http://localhost:${PORT}/`,
    env: { PORT: String(PORT), ROOT: E2E_ROOT },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
