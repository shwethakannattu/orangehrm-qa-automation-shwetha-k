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
    // Confirmed via a real failure's accessibility snapshot: this is a
    // plain textbox with placeholder "Type for hints..." — the same
    // placeholder also appears on the Supervisor Name field further down
    // the form, so .first() picks the Employee Name one (it comes first
    // in the DOM).
    this.employeeNameFilter = page.getByPlaceholder("Type for hints...").first();
    this.searchButton = page.getByRole("button", { name: "Search" });
    // Same snapshot showed a real table with rowgroup/row/cell ARIA roles
    // (thead is the first rowgroup, tbody the second), not the "card" div
    // pattern originally guessed.
    this.resultRows = page.getByRole("rowgroup").nth(1).getByRole("row");
  }

  async goto(baseUrl: string) {
    // See LoginPage.goto — the demo app shell can be slow to boot.
    await this.page.goto(`${baseUrl}/web/index.php/pim/viewEmployeeList`, {
      waitUntil: "domcontentloaded",
    });
    await this.employeeNameFilter.waitFor({ state: "visible", timeout: 60_000 });
  }

  async searchByName(fullName: string) {
    await this.employeeNameFilter.fill(fullName);
    await this.page.getByRole("option", { name: new RegExp(fullName, "i") }).first().click();
    await this.searchButton.click();
  }

  /**
   * Same search field, but doesn't require an autocomplete suggestion to
   * exist and be clicked — use this to search for a name that may not
   * match any current employee (e.g. confirming one no longer exists after
   * deletion). Confirmed via a real run: searchByName() times out here
   * because deleting the employee first means typing their name can never
   * produce a matching suggestion to click, even though the raw text alone
   * is enough for the list's own filter to correctly return zero rows.
   */
  async searchByNameTextOnly(fullName: string) {
    await this.employeeNameFilter.fill(fullName);
    await this.searchButton.click();
  }

  async openFirstResult() {
    await this.resultRows.first().click();
  }

  async deleteFirstResult() {
    // Each row's Actions cell holds exactly two unlabeled icon buttons in
    // DOM order: edit, then delete (confirmed via accessibility snapshot —
    // neither has an accessible name, so position is the reliable signal
    // here, not an icon class we can't verify without the live DOM).
    await this.resultRows.first().locator("button").last().click();
    await this.page.getByRole("button", { name: "Yes, Delete" }).click();
  }

  async expectNoRecordsFound() {
    // NOT a plain getByText() — confirmed via a real run's strict-mode
    // error that it matches two elements with identical text: the table's
    // own empty-state indicator (a <span>) AND a toast notification (a <p>,
    // inside #oxd-toaster) that also says "No Records Found" and can still
    // be lingering on screen from the search itself. Scoping to the <span>
    // is what the error's own resolved-elements list showed as the real
    // table indicator.
    await expect(this.page.locator("span").filter({ hasText: "No Records Found" })).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectResultCount(count: number) {
    await expect(this.resultRows).toHaveCount(count, { timeout: 20_000 });
  }
}
