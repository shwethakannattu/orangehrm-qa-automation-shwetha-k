import { test, expect } from "@playwright/test";
import { config } from "../../config/env";
import { LoginPage } from "../../pages/LoginPage";
import { DashboardPage } from "../../pages/DashboardPage";
import { AddEmployeePage } from "../../pages/AddEmployeePage";
import { EmployeeListPage } from "../../pages/EmployeeListPage";
import { PersonalDetailsPage } from "../../pages/PersonalDetailsPage";
import { generateEmployee, GeneratedEmployee } from "../../utils/testData";
import { captureApiCall } from "../../utils/apiCapture";
import { logger } from "../../utils/logger";

/**
 * Part 1: Advanced End-to-End Automation — full employee lifecycle.
 *
 * Run serially: creation must happen before update/validate/delete, and
 * each stage depends on state (employee id, generated credentials) from
 * the previous one. Kept as separate test() blocks rather than one giant
 * test so a failure at "update" doesn't hide whether "create" worked —
 * see README "Key Design Decisions".
 *
 * The two independent login tests live in authentication.spec.ts instead —
 * see the comment there for why (a real CI sharding bug, not just tidiness).
 */
test.describe.serial("Employee lifecycle @regression", () => {
  let employee: GeneratedEmployee;
  let employeeId: string;

  test.beforeAll(() => {
    employee = generateEmployee();
  });

  test("Employee creation — Admin creates a new employee with ESS login @api", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.adminUsername, config.adminPassword);
    await loginPage.expectLoginSucceeded();

    const addEmployeePage = new AddEmployeePage(page);
    await addEmployeePage.goto(config.baseUrl);
    await addEmployeePage.fillBasicDetails(employee.firstName, employee.lastName);
    await addEmployeePage.enableLoginDetails(employee.username, employee.password);

    employeeId = await addEmployeePage.getGeneratedEmployeeId();
    logger.step(`Generated Employee Id: ${employeeId}`);

    const { status, body } = await captureApiCall(
      page,
      /\/api\/v2\/pim\/employees/,
      async () => addEmployeePage.save()
    );

    expect(status, "Employee creation API should return 200").toBe(200);
    expect(body, "Creation response body should be present").toBeTruthy();
    await expect(page).toHaveURL(/pim\/viewPersonalDetails/);
  });

  test("Role-based validation — ESS user sees a restricted menu vs Admin @regression", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Baseline: full Admin menu.
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.adminUsername, config.adminPassword);
    await loginPage.expectLoginSucceeded();
    const adminMenuItems = await dashboardPage.getVisibleMenuItems();
    logger.step(`Admin menu items: ${adminMenuItems.join(", ")}`);
    expect(adminMenuItems).toContain("Admin");
    expect(adminMenuItems).toContain("PIM");
    await dashboardPage.logout();

    // ESS user created above should have a visibly smaller menu and no "Admin" module.
    await loginPage.goto(config.baseUrl);
    await loginPage.login(employee.username, employee.password);
    await loginPage.expectLoginSucceeded();
    const essMenuItems = await dashboardPage.getVisibleMenuItems();
    logger.step(`ESS menu items: ${essMenuItems.join(", ")}`);
    expect(essMenuItems).not.toContain("Admin");
    expect(essMenuItems.length).toBeLessThan(adminMenuItems.length);
  });

  test("Employee update — Admin updates a personal detail and it persists @api", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.adminUsername, config.adminPassword);
    await loginPage.expectLoginSucceeded();

    const employeeListPage = new EmployeeListPage(page);
    await employeeListPage.goto(config.baseUrl);
    await employeeListPage.searchByName(employee.fullName);
    await employeeListPage.openFirstResult();

    const personalDetailsPage = new PersonalDetailsPage(page);
    await personalDetailsPage.waitForLoaded();
    const newLicenseNumber = `DL-${employeeId}`;

    // Left unanchored — the demo doesn't publish its API shape, and a real
    // run showed the actual save request can legitimately sit under a
    // sub-path (anchoring to end-of-path/query previously excluded it
    // entirely and caused a 15s timeout with nothing matching at all).
    // Filtered to a mutation verb instead, which is what actually
    // distinguishes the real save from the unrelated background GETs this
    // page fires (e.g. the Attachments tab's own fetch) — that filter is
    // what stops one of those GETs from winning the race and being
    // captured in place of the real save. If the exact verb below is ever
    // wrong again, apiCapture.ts now logs every URL-matching response it
    // sees regardless of method, so the real one shows up directly in the
    // run's own output instead of requiring another guess.
    const { status } = await captureApiCall(
      page,
      /\/api\/v2\/pim\/employees\/\d+/,
      async () => personalDetailsPage.updateDrivingLicenseNumber(newLicenseNumber),
      ["PUT", "POST", "PATCH"]
    );

    expect(status, "Employee update API should return 200").toBe(200);
    await personalDetailsPage.expectUpdateSaved();

    // Reload to prove the change actually persisted server-side, not just in the UI state.
    await page.reload();
    await personalDetailsPage.expectDrivingLicenseValue(newLicenseNumber);
  });

  test("Employee deletion — Admin deletes the employee and it disappears from the list @api", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.adminUsername, config.adminPassword);
    await loginPage.expectLoginSucceeded();

    const employeeListPage = new EmployeeListPage(page);
    await employeeListPage.goto(config.baseUrl);
    await employeeListPage.searchByName(employee.fullName);

    // Filtered to a mutation verb for the same reason as the update test
    // above: the unanchored URL match alone can't tell this apart from an
    // unrelated GET firing around the same time. Includes POST since some
    // OrangeHRM list actions submit a bulk-delete as a POST with an ids
    // array rather than a plain DELETE — unconfirmed against a real run
    // yet, so left permissive rather than guessed narrowly; apiCapture.ts
    // will log the real verb if this needs correcting.
    const { status } = await captureApiCall(
      page,
      /\/api\/v2\/pim\/employees/,
      async () => employeeListPage.deleteFirstResult(),
      ["DELETE", "POST"]
    );

    expect(status, "Employee delete API should return 200").toBe(200);

    // searchByName() here would wait forever for an autocomplete suggestion
    // that can never appear now that this employee is gone — see
    // EmployeeListPage.searchByNameTextOnly().
    await employeeListPage.goto(config.baseUrl);
    await employeeListPage.searchByNameTextOnly(employee.fullName);
    await employeeListPage.expectNoRecordsFound();
  });
});
