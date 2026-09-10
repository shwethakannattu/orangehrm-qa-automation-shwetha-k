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
    this.createLoginDetailsToggle = page.getByText("Create Login Details").locator("..").locator("button");
    this.usernameInput = page.locator(".oxd-grid-item:has-text('Username') input");
    this.passwordInput = page.locator(".oxd-grid-item:has-text('Password') input").first();
    this.confirmPasswordInput = page.locator(".oxd-grid-item:has-text('Confirm Password') input");
    this.saveButton = page.getByRole("button", { name: "Save" });
  }

  async goto(baseUrl: string) {
    await this.page.goto(`${baseUrl}/web/index.php/pim/addEmployee`);
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
