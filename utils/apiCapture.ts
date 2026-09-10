import { Page, Response } from "@playwright/test";
import { logger } from "./logger";

/**
 * Part 1 requires "API-level verification" but the public OrangeHRM demo
 * does not publish an external REST API contract for employee CRUD.
 * Instead of skipping this requirement or hitting an undocumented endpoint
 * blindly, this helper captures the real network call the UI itself fires
 * (the same internal API the browser calls) while performing an action, so
 * we can assert on the actual JSON response body and HTTP status — genuine
 * API-level proof, not just a visual/UI check.
 *
 * This is a deliberate design decision — see README "Key Design Decisions".
 */
export async function captureApiCall(
  page: Page,
  urlPattern: RegExp,
  action: () => Promise<void>
): Promise<{ status: number; body: unknown }> {
  const [response] = await Promise.all([
    page.waitForResponse((res: Response) => urlPattern.test(res.url()), { timeout: 15_000 }),
    action(),
  ]);

  const status = response.status();
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    logger.warn(`Response from ${response.url()} was not JSON — skipping body capture.`);
  }

  logger.api(`${response.request().method()} ${response.url()} -> ${status}`);
  return { status, body };
}
