import { Locator, Page } from "@playwright/test";

/**
 * Page Object for PIM > Add Employee, including the optional
 * "Create Login Details" section used to provision an ESS-role account
 * for Part 1's role-based validation step.
 */
export class AddEmployeePage {
  readonly page: Page;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly createLoginDetailsToggle: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.firstNameInput = page.getByPlaceholder("First Name");
    this.lastNameInput = page.getByPlaceholder("Last Name");
    this.employeeIdInput = page.locator(".oxd-grid-item:has-text('Employee Id') input");
    // This is a hidden native <input type="checkbox"> with a custom-styled
    // <span class="oxd-switch-input"> drawn on top of it — real users click
    // the visible span, and Playwright's actionability check correctly
    // refuses to click the input underneath it (it's genuinely covered).
    // Confirmed via the actual DOM captured in a real failure's error
    // context: `<span ... class="oxd-switch-input ...">` intercepts
    // pointer events on the checkbox. Target that span instead.
    this.createLoginDetailsToggle = page
      .getByText("Create Login Details", { exact: true })
      .locator("..")
      .locator(".oxd-switch-input");
    this.usernameInput = page.locator(".oxd-grid-item:has-text('Username') input");
    this.passwordInput = page.locator(".oxd-grid-item:has-text('Password') input").first();
    this.confirmPasswordInput = page.locator(".oxd-grid-item:has-text('Confirm Password') input");
    this.saveButton = page.getByRole("button", { name: "Save" });
  }

  async goto(baseUrl: string) {
    // See LoginPage.goto — the demo app shell can be slow to boot.
    await this.page.goto(`${baseUrl}/web/index.php/pim/addEmployee`, {
      waitUntil: "domcontentloaded",
    });
    await this.firstNameInput.waitFor({ state: "visible", timeout: 60_000 });
  }

  async fillBasicDetails(firstName: string, lastName: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
  }

  /** Reads the auto-generated Employee Id before saving, for later assertions. */
  async getGeneratedEmployeeId(): Promise<string> {
    return (await this.employeeIdInput.inputValue()).trim();
  }

  async enableLoginDetails(username: string, password: string) {
    await this.createLoginDetailsToggle.click();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
  }

  async save() {
    await this.saveButton.click();
  }
}
