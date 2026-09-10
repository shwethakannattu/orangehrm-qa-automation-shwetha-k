import { test } from "@playwright/test";
import { config } from "../../config/env";
import { LoginPage } from "../../pages/LoginPage";

/**
 * Part 1: Authentication — split into its own file from
 * employee-lifecycle.spec.ts. These two tests are fully independent of
 * each other and of the create → validate → update → delete chain (no
 * shared state), so they don't need test.describe.serial.
 *
 * This split also fixes a real CI bug: Playwright's --shard splits tests
 * by spec FILE, not by individual test. With every test in one file, a
 * 2-shard matrix put all 6 tests in shard 1 and left shard 2 with zero
 * test files — which Playwright treats as an error and fails outright,
 * regardless of whether the tests themselves would have passed. Two files
 * gives the matrix two real shards to actually split across.
 */
test("Authentication — Admin can log in with valid credentials @smoke", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto(config.baseUrl);
  await loginPage.login(config.adminUsername, config.adminPassword);
  await loginPage.expectLoginSucceeded();
});

test("Authentication — invalid credentials are rejected @smoke", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto(config.baseUrl);
  await loginPage.login("Admin", "not-the-real-password");
  await loginPage.expectInvalidCredentialsError();
});
