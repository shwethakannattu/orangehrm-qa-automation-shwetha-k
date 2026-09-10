import { Locator, Page } from "@playwright/test";

/**
 * Page Object for the shared OrangeHRM app shell (top bar + side menu).
 * Used both to navigate between modules and, for Part 1's role-based
 * validation, to read which menu items a logged-in role can actually see.
 */
export class DashboardPage {
  readonly page: Page;
  readonly sideMenu: Locator;
  readonly userDropdown: Locator;
  readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    // Located by accessible role/name (confirmed against the real sidebar's
    // accessibility snapshot: <nav aria-label="Sidepanel">) rather than
    // guessed CSS classes, which returned zero matches.
    this.sideMenu = page.getByRole("navigation", { name: "Sidepanel" });
    this.userDropdown = page.locator(".oxd-userdropdown-tab");
    this.logoutLink = page.getByRole("menuitem", { name: "Logout" });
  }

  /** Returns the visible top-level menu item labels for the current user's role. */
  async getVisibleMenuItems(): Promise<string[]> {
    await this.sideMenu.waitFor({ state: "visible", timeout: 30_000 });
    // The module links live inside a <ul>/<li> list within the sidebar nav
    // (confirmed via accessibility snapshot: list > listitem > link), so
    // scope to listitem links specifically — this also excludes the brand
    // logo link, which sits outside that list.
    const items = this.sideMenu.getByRole("listitem").getByRole("link");
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).trim();
      if (text) labels.push(text);
    }
    return labels;
  }

  async goToModule(name: string) {
    await this.page.getByRole("link", { name, exact: true }).click();
  }

  async logout() {
    await this.userDropdown.click();
    await this.logoutLink.click();
  }
}
