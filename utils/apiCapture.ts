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
  action: () => Promise<void>,
  method?: string | string[]
): Promise<{ status: number; body: unknown }> {
  // urlPattern is intentionally unanchored so callers can match a resource
  // by id without knowing the exact sub-path — but that means it also
  // matches unrelated nested resources sharing that same id prefix (e.g.
  // ".../employees/370/screen/personal/attachments" contains
  // ".../employees/370" too). Confirmed via a real failed run: without a
  // method filter, that kind of unrelated GET can win the race against the
  // actual save request, so the save is never awaited and gets cancelled by
  // the test's subsequent page.reload(). Pass `method` (one value or a list
  // — the exact verb the app uses for a given mutation isn't documented, so
  // giving a list of plausible ones is safer than a single guess) for any
  // capture around a mutation, to rule GETs like the one above out.
  const methods = method ? (Array.isArray(method) ? method : [method]).map((m) => m.toUpperCase()) : null;

  // Every response whose URL matches is logged as it happens — regardless
  // of whether it satisfies `methods` — so that if the strict wait below
  // ever times out, the real endpoint(s) actually called are right there in
  // the run's own output instead of requiring another round trip to guess
  // at. This is what should make future capture bugs, if any, fixable from
  // the terminal output alone.
  const seen: string[] = [];
  const sniffer = (res: Response) => {
    if (urlPattern.test(res.url())) {
      const entry = `${res.request().method()} ${res.url()} -> ${res.status()}`;
      seen.push(entry);
      logger.api(`(seen during capture) ${entry}`);
    }
  };
  page.on("response", sniffer);

  let response: Response;
  try {
    [response] = await Promise.all([
      page.waitForResponse(
        (res: Response) => urlPattern.test(res.url()) && (!methods || methods.includes(res.request().method().toUpperCase())),
        { timeout: 15_000 }
      ),
      action(),
    ]);
  } catch (err) {
    const candidates = seen.length
      ? `Responses that matched the URL pattern but not the method filter (${methods?.join("/")}):\n  ${seen.join("\n  ")}`
      : "No response matching the URL pattern was seen at all during this action.";
    throw new Error(`captureApiCall: no matching response arrived in time.\n${candidates}\n\nOriginal error: ${err}`);
  } finally {
    page.off("response", sniffer);
  }

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
