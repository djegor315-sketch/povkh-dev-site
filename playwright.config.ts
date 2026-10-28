import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    // Astro backgrounds dev servers inside detected agent environments. Playwright
    // needs to own a foreground process so it can track readiness and shut it down.
    command: "npm run dev -- --host 127.0.0.1 --ignore-lock",
    env: { ...process.env, ASTRO_DEV_BACKGROUND: "0" },
    url: "http://127.0.0.1:4321",
    reuseExistingServer: false,
  },
});
