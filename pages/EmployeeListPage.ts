import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object for PIM > Employee List: search, open a record, and delete it.
 */
export class EmployeeListPage {
  readonly page: Page;
  readonly employeeNameFilter: Locator;
  readonly searchButton: Locator;
  readonly resultRows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.employeeNameFilter = page.locator(".oxd-autocomplete-input").first();
    this.searchButton = page.getByRole("button", { name: "Search" });
    this.resultRows = page.locator(".oxd-table-card");
  }

  async goto(baseUrl: string) {
    await this.page.goto(`${baseUrl}/web/index.php/pim/viewEmployeeList`);
  }

  async searchByName(fullName: string) {
    await this.employeeNameFilter.fill(fullName);
    await this.page.getByRole("option", { name: new RegExp(fullName, "i") }).first().click();
    await this.searchButton.click();
  }

  async openFirstResult() {
    await this.resultRows.first().click();
  }

  async deleteFirstResult() {
    await this.resultRows.first().locator("button:has(.bi-trash)").click();
    await this.page.getByRole("button", { name: "Yes, Delete" }).click();
  }

  async expectNoRecordsFound() {
    await expect(this.page.getByText("No Records Found")).toBeVisible({ timeout: 10_000 });
  }

  async expectResultCount(count: number) {
    await expect(this.resultRows).toHaveCount(count, { timeout: 10_000 });
  }
}
