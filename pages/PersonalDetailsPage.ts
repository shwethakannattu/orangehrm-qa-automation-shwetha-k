import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object for an individual employee's "Personal Details" tab
 * (PIM > Employee List > [employee]). Used for the Part 1 "Employee
 * update" step.
 */
export class PersonalDetailsPage {
  readonly page: Page;
  readonly drivingLicenseInput: Locator;
  readonly saveButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    // Confirmed via a real failure's screenshot + accessibility snapshot:
    // the field's actual label is "Driver's License Number" (with an
    // apostrophe), not "Driving License Number" as originally guessed —
    // that text mismatch alone was why this locator matched zero elements.
    // Double-quoting the :has-text() argument avoids fighting the label's
    // own apostrophe inside a single-quoted selector.
    this.drivingLicenseInput = page
      .locator(`.oxd-grid-item:has-text("Driver's License Number") input`)
      .first();
    // NOT "button[type='submit']" — that also matches the sidebar's search
    // icon button (it's a <button type="submit"> too, next to the "Search"
    // textbox), which sits earlier in the DOM than this form's Save button.
    // .first() on that broader selector was silently clicking the sidebar
    // search button instead: no error, a stray toast still appeared, but
    // the license number was never actually submitted (confirmed empty
    // after a reload in a real run). Scope to the button's accessible
    // name instead, which the search icon button doesn't have.
    this.saveButton = page.getByRole("button", { name: "Save", exact: true }).first();
    this.successToast = page.locator(".oxd-toast-content--success");
  }

  /**
   * Waits for this tab's own fields to be ready. Call this after navigating
   * here (e.g. via EmployeeListPage.openFirstResult(), which doesn't itself
   * wait for the destination page) and before capturing a network call
   * around a save — otherwise a still-in-flight page-load request can
   * satisfy a broad response-matcher before the actual save request does.
   */
  async waitForLoaded() {
    await this.drivingLicenseInput.waitFor({ state: "visible", timeout: 60_000 });
  }

  async updateDrivingLicenseNumber(value: string) {
    // NOT .fill() — confirmed via a real failed run's Playwright trace,
    // inspected two ways: the exact DOM snapshot taken right before Save
    // was clicked showed the input's raw value WAS "DL-xxxx" (so fill()
    // itself worked, and a follow-up Tab-to-blur genuinely fired — the
    // other field visibly had focus in that same snapshot), yet the PUT
    // request's actual JSON body still carried "drivingLicenseNo": "".
    // That combination means the on-screen DOM value was right but this
    // component's own internal (Vue) state behind the Save button never
    // picked it up — fill()'s single synthetic "input" event isn't enough
    // for whatever custom binding this input uses. Typing it out with real
    // per-character key events is the standard fix for that class of
    // component and is what an actual user's keystrokes would produce.
    await this.drivingLicenseInput.click();
    await this.drivingLicenseInput.pressSequentially(value, { delay: 20 });
    await this.drivingLicenseInput.press("Tab");
    await this.saveButton.click();
  }

  async expectUpdateSaved() {
    await expect(this.successToast).toBeVisible({ timeout: 20_000 });
  }

  async expectDrivingLicenseValue(value: string) {
    await expect(this.drivingLicenseInput).toHaveValue(value);
  }
}
