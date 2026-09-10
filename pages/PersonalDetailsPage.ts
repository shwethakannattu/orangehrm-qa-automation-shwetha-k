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
    this.drivingLicenseInput = page
      .locator(".oxd-grid-item:has-text('Driving License Number') input")
      .first();
    this.saveButton = page.locator("button[type='submit']").first();
    this.successToast = page.locator(".oxd-toast-content--success");
  }

  async updateDrivingLicenseNumber(value: string) {
    await this.drivingLicenseInput.fill(value);
    await this.saveButton.click();
  }

  async expectUpdateSaved() {
    await expect(this.successToast).toBeVisible({ timeout: 10_000 });
  }

  async expectDrivingLicenseValue(value: string) {
    await expect(this.drivingLicenseInput).toHaveValue(value);
  }
}
