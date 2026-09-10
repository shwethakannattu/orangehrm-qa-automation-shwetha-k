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
    this.sideMenu = page.locator(".oxd-main-menu");
    this.userDropdown = page.locator(".oxd-userdropdown-tab");
    this.logoutLink = page.getByRole("menuitem", { name: "Logout" });
  }

  /** Returns the visible top-level menu item labels for the current user's role. */
  async getVisibleMenuItems(): Promise<string[]> {
    const items = this.sideMenu.locator("a.oxd-main-menu-item span");
    const count = await items.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push((await items.nth(i).innerText()).trim());
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
