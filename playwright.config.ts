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
  // The public OrangeHRM demo's app shell has been observed taking
  // anywhere from ~15s to hanging indefinitely on some networks (see
  // README "Known instability" note) — sized generously, but not
  // unbounded, so a genuine hang still fails loudly instead of blocking
  // the suite for minutes.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false, // employee-lifecycle tests share state and must run in order
  forbidOnly: !!process.env.CI,

  // --- Part 4: Test Stability & Reliability -------------------------------
  // Retry everywhere, not just CI: the demo instance itself has shown
  // intermittent full hangs unrelated to our code (see README), so a
  // local retry is what actually reflects "the flow works, the shared
  // demo server occasionally doesn't" rather than masking a real bug.
  retries: 2,

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
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    launchOptions: {
      ...(localChromiumPath ? { executablePath: localChromiumPath } : {}),
      // Some corporate networks / security software treat traffic from an
      // automated ("Automation Controlled") Chromium differently than a
      // normal browser session. This flag removes that signal — harmless
      // if it isn't the cause, but a common fix when a site loads fine
      // manually yet hangs specifically under Playwright/Selenium.
      args: ["--disable-blink-features=AutomationControlled"],
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
