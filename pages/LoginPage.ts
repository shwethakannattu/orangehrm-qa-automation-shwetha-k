import { expect, Locator, Page } from "@playwright/test";
import { logger } from "../utils/logger";

/**
 * Page Object for the OrangeHRM login screen.
 * Exposes actions + getters only — assertions stay in the test files.
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByPlaceholder("Username");
    this.passwordInput = page.getByPlaceholder("Password");
    this.loginButton = page.getByRole("button", { name: "Login" });
    this.errorAlert = page.locator(".oxd-alert-content-text");
  }

  async goto(baseUrl: string) {
    // The public OrangeHRM demo has shown intermittent full hangs during
    // development — the DOM loads but the app shell never finishes
    // rendering, with no failed request or console error to explain it
    // (consistent with a connection being silently dropped somewhere on
    // the network path rather than a real app/test bug — see README
    // "Known instability"). These listeners + step timing are kept
    // permanently, not just for this debugging session: they're exactly
    // what you'd want surfaced in CI logs the next time this happens.
    this.page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        logger.warn(`console.${msg.type()}: ${msg.text()}`);
      }
    });
    this.page.on("pageerror", (err) => {
      logger.warn(`pageerror: ${err.message}`);
    });
    this.page.on("requestfailed", (request) => {
      logger.warn(
        `requestfailed: ${request.method()} ${request.url()} -> ${request.failure()?.errorText}`
      );
    });
    this.page.on("response", (response) => {
      if (response.status() >= 400) {
        logger.warn(`bad response: ${response.status()} ${response.url()}`);
      }
    });

    const start = Date.now();

    await this.page.goto(`${baseUrl}/web/index.php/auth/login`, {
      waitUntil: "domcontentloaded",
    });
    const afterDomContentLoaded = Date.now();
    logger.step(
      `goto() -> domcontentloaded took ${afterDomContentLoaded - start}ms`
    );

    // A real CI run (see README "Known instability") showed this hang can
    // outlast a full 60s wait AND both of Playwright's own test-level
    // retries in a row — i.e. it isn't a one-off blip within a single
    // attempt, it's the demo app shell staying stuck for minutes at a
    // time. A plain longer timeout just waits longer on a page that's
    // already stuck; a reload forces a fresh render cycle, which is what
    // actually resolves this failure mode when it happens locally. One
    // bounded reload attempt here is cheap and doesn't hide a real bug —
    // if the username field still never appears after a fresh load, this
    // still fails loudly.
    try {
      await this.usernameInput.waitFor({ state: "visible", timeout: 45_000 });
    } catch (err) {
      logger.warn(
        `username field did not appear within 45s of domcontentloaded — reloading once before giving up (see README "Known instability")`
      );
      await this.page.reload({ waitUntil: "domcontentloaded" });
      await this.usernameInput.waitFor({ state: "visible", timeout: 45_000 });
    }
    const afterUsernameVisible = Date.now();
    logger.step(
      `username field became visible ${afterUsernameVisible - afterDomContentLoaded}ms after domcontentloaded`
    );
    logger.step(`TOTAL goto() time: ${afterUsernameVisible - start}ms`);
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSucceeded() {
    await expect(this.page).toHaveURL(/dashboard/, { timeout: 20_000 });
  }

  async expectInvalidCredentialsError() {
    await expect(this.errorAlert).toHaveText(/Invalid credentials/i);
  }
}
