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

    await this.usernameInput.waitFor({ state: "visible", timeout: 60_000 });
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
