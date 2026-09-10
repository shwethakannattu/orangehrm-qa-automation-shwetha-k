# OrangeHRM QA Automation Framework

A scalable Playwright + TypeScript automation framework covering the full employee lifecycle on [OrangeHRM](https://opensource-demo.orangehrmlive.com/) — authentication, employee creation, role-based validation, update, API-level verification, and deletion — built for the Senior QA Automation Engineer technical test, with CI/CD continuous testing via GitHub Actions and JMeter performance tests for the Login and Employee Creation APIs.

## Tech stack

- **Playwright + TypeScript** — end-to-end and API-level verification
- **Page Object Model** — one class per screen under `pages/`
- **GitHub Actions** — CI/CD pipeline with sharded parallel execution and published HTML reports
- **Apache JMeter** — performance testing for the Login and Employee Creation APIs
- **AI-assisted development** — Claude (see below)

## Setup instructions

1. Install [Node.js LTS](https://nodejs.org/) (v18+) and [Git](https://git-scm.com/).
2. Clone the repository and install dependencies:
   ```bash
   git clone <this-repo-url>
   cd orangehrm-qa-automation-shwetha-k
   npm install
   npx playwright install --with-deps chromium
   ```
3. Copy the environment template and adjust if needed (the defaults already point at the public OrangeHRM demo):
   ```bash
   cp .env.example .env
   ```
4. (Performance tests only) Install a JDK (11+) and [Apache JMeter](https://jmeter.apache.org/download_jmeter.cgi) — see `performance/README.md` for exact steps.

## Execution steps

```bash
npm test                 # full suite
npm run test:headed      # full suite, visible browser
npm run test:smoke       # @smoke tagged tests only (fast sanity check)
npm run test:regression  # @regression tagged tests
npm run test:api         # @api tagged tests (API-level verification steps)
npm run test:dev         # explicit dev environment
npm run test:staging     # explicit staging environment (placeholder config)
npm run report           # open the last local HTML report
```

Performance tests: see `performance/README.md`.

## Key design decisions

**Playwright + TypeScript over Selenium/Java.** My production experience includes both Playwright framework builds and Selenium WebDriver in Java; I chose Playwright + TypeScript here because it's the stack this role is hiring for, and Playwright's built-in auto-waiting, tracing, and network interception are a strong fit for the test's stability and API-verification requirements.

**API-level verification via network interception, not a public REST contract.** The public OrangeHRM demo doesn't publish an external API spec for employee CRUD. Rather than skip this requirement or guess at an undocumented endpoint, `utils/apiCapture.ts` uses Playwright's `page.waitForResponse()` to capture the actual internal API call the UI fires during creation, update, and deletion, and asserts on the real HTTP status and JSON response body. This is genuine API-level proof rather than a UI-only check.

**Role-based validation via a self-provisioned ESS account.** No second test account was provided, so the "Employee creation" step also enables OrangeHRM's "Create Login Details" option to provision an ESS-role login in the same flow, which "Role-based validation" then uses to compare the ESS user's visible menu against the Admin's.

**Sequential, per-stage tests instead of one monolithic test.** `test.describe.serial()` keeps the lifecycle in order (create → validate → update → verify → delete) while each stage stays its own `test()`, so a failure at "update" doesn't obscure whether "create" actually succeeded — each stage reports independently in the HTML report.

**Unique test data per run.** `utils/testData.ts` generates a unique name/username per execution (via `@faker-js/faker` + a timestamp suffix) so repeated runs against the shared public demo never collide with data from a previous run, and `afterAll`/the deletion test clean up what was created.

**Environment-based configuration.** `config/env.ts` selects a config object by `TEST_ENV` (`dev`/`staging`), loaded via `dotenv`, rather than hardcoding URLs/credentials in test files — this is what `npm run test:dev` / `npm run test:staging` switch between.

**JMeter over K6 for performance testing.** The recruiter's instructions explicitly accept either JMeter or K6; I used JMeter, which I already have hands-on depth in, to deliver a more reliable, correctly-thresholded result under the assignment's timeline. I'm equally comfortable picking up K6 — the underlying load-testing concepts (virtual users, thresholds, HTML reporting) are the same tool-to-tool, and K6's JS-based scripting is a natural extension of the TypeScript used throughout this framework.

## Test stability & reliability (Part 4)

- **Retries:** `playwright.config.ts` retries failed tests twice in CI (`process.env.CI`), never silently on a developer's machine, so a genuinely broken test is never masked locally.
- **Smart waiting:** no hard-coded `sleep()` calls anywhere in the suite — every interaction relies on Playwright's built-in actionability auto-waiting, backed by explicit `expect(...).toBeVisible()/toHaveValue()` assertions at each verification point.
- **Failure evidence:** `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, and `trace: 'on-first-retry'` are all configured, so every failure ships with a screenshot, a video, and (on retry) a fully interactive Playwright trace — no need to reproduce locally to start debugging.

**Flaky test detection.** In a real team setting I'd track pass/fail history per test across CI runs (Playwright's HTML report keeps this per run; a lightweight rerun-and-diff script or a test-analytics tool like Playwright's own trend view works for longer-term tracking) and flag any test whose outcome changes across otherwise-identical runs rather than letting CI auto-retry it into a green build unnoticed.

**Flaky test mitigation.** Stable, semantic locators (`getByRole`, `getByPlaceholder`, rather than brittle CSS/XPath chains); per-run unique test data so tests never depend on shared, mutable state; no inter-test dependencies beyond the deliberate lifecycle chain in `employee-lifecycle.spec.ts`; retries used strictly as a CI safety net, with any test that needs a retry to pass treated as a bug to investigate, not a pass.

## Reporting & observability (Part 6)

- **HTML reports:** Playwright's built-in HTML reporter (locally); CI runs shard the suite and merge each shard's report into one combined HTML report artifact (see `.github/workflows/ci.yml`).
- **Screenshots & videos on failure:** configured in `playwright.config.ts` (see above).
- **Tagging strategy:** `@smoke`, `@regression`, and `@api` tags on individual `test()` titles; run a subset with `npx playwright test --grep @smoke`.
- **Environment-based execution:** `npm run test:dev` / `npm run test:staging`, backed by `config/env.ts`.

## AI-assisted development

As required by the assignment, this submission was built with AI assistance throughout, using **Claude**:
- Scaffolding the project structure, Page Object Model classes, and Playwright configuration
- Structuring the GitHub Actions CI workflow (sharding, blob-report merge, artifact publishing)
- Authoring the JMeter test plan's structure and threshold assertions
- Drafting and refining this README

All generated code was reviewed, adjusted, and is understood by me — AI accelerated the scaffolding and documentation; the test design, locator strategy, and engineering decisions above are mine.

## A note on live execution in this environment

This framework was built and **type-checked cleanly** (`npx tsc --noEmit`) in a sandboxed development environment whose outbound network access is restricted by an organization egress policy that does not allow reaching `opensource-demo.orangehrmlive.com` directly. Because of that, the suite could not be executed end-to-end against the live site from that environment, and the JMeter plan could only be validated as well-formed XML there rather than run live. Both are expected to run correctly on an unrestricted machine or in GitHub Actions (which is exactly what the CI workflow in this repo does on every push) — **please run `npm test` locally once, and check the first GitHub Actions run, before treating this as final**, and adjust any selector that doesn't match 1:1 (OrangeHRM's demo UI does shift slightly between releases; the most likely candidates are the "Create Login Details" toggle and the delete icon selector in `pages/AddEmployeePage.ts` / `pages/EmployeeListPage.ts`).

## Growth areas

This test's scope (OrangeHRM web + API) doesn't touch two areas the job description calls out — Salesforce/SOQL/SOSL validation and mobile automation with Appium/WebdriverIO. I don't have hands-on depth in either yet, but I've picked up new automation stacks quickly before (this Playwright framework and AI-assisted development itself were both things I learned on the job), and I'm looking forward to building that depth as part of this role.
