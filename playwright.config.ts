import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Local-sandbox-only override: this project's dev container has a
 * pre-installed Chromium binary at a fixed path instead of one downloaded
 * by `playwright install`. Set PW_CHROMIUM_PATH to use it. Leave it unset
 * everywhere else (your machine, CI) so Playwright uses its normal,
 * version-matched managed browser — that's why this only applies
 * conditionally below.
 */
const localChromiumPath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false, // employee-lifecycle tests share state and must run in order
  forbidOnly: !!process.env.CI,

  // --- Part 4: Test Stability & Reliability -------------------------------
  // Retry flaky failures automatically in CI (never silently in local dev,
  // so a genuinely broken test doesn't look "fine" on your machine).
  retries: process.env.CI ? 2 : 0,

  // Parallel workers for CI sharding (Part 3); serial locally for clearer
  // failure output while building the suite.
  workers: process.env.CI ? 2 : 1,

  // --- Part 6: Reporting & Observability ----------------------------------
  // In CI, each shard writes a "blob" report; the CI workflow's
  // merge-reports step combines all shards into one HTML report so
  // reviewers get a single artifact regardless of how many shards ran.
  // Locally (no sharding), the HTML reporter writes straight to
  // playwright-report/ for `npm run report` to open directly.
  reporter: process.env.CI
    ? [["blob", { outputDir: "blob-report" }], ["list"]]
    : [["html", { open: "never", outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL: process.env.BASE_URL || "https://opensource-demo.orangehrmlive.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    launchOptions: localChromiumPath ? { executablePath: localChromiumPath } : {},
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
