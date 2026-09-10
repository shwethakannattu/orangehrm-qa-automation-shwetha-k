import { expect, Locator, Page } from "@playwright/test";

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
    await this.page.goto(`${baseUrl}/web/index.php/auth/login`);
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSucceeded() {
    await expect(this.page).toHaveURL(/dashboard/, { timeout: 10_000 });
  }

  async expectInvalidCredentialsError() {
    await expect(this.errorAlert).toHaveText(/Invalid credentials/i);
  }
}
