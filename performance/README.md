# Performance Testing (Part 5) — JMeter

`employee-lifecycle.jmx` contains two Thread Groups against the public OrangeHRM demo:

| Thread Group | Endpoint | Threads | Thresholds |
|---|---|---|---|
| Login API | `POST /web/index.php/auth/login` | 10 | HTTP 200/302, response time < 2000ms |
| Employee Creation API | `POST /web/index.php/api/v2/pim/employees` | 5 | HTTP 200, response time < 3000ms |

Load is intentionally light (5–10 threads, short ramp-up, single loop) — this is a shared public demo instance, and the goal is demonstrating the technique correctly, not stress-testing someone else's server.

## Login flow

The login form isn't a plain `POST /auth/login` — `/auth/login` is GET-only (a real run against it returned `405 Method Not Allowed`, confirmed via the raw `.jtl`). Each thread group instead runs:

1. `GET /web/index.php/auth/login` — establishes the session cookie and returns the page HTML.
2. A Regex Extractor pulls a per-session CSRF token out of that HTML. It isn't a conventional hidden `<input>` — it's a Vue component prop: `<auth-login :token="&quot;<TOKEN>&quot;" ...>` — confirmed by fetching the live demo's raw (pre-render) HTML directly. Regex: `:token="&quot;(.*?)&quot;`.
3. `POST /web/index.php/auth/validate` — the form's real `action`, confirmed the same way — with `username`, `password`, and `_token` (the extracted value).

Both the Login API and Employee Creation API thread groups run this sequence independently rather than sharing a session between them: separate JMeter thread groups mean separate threads, and each gets its own Cookie Manager jar that isn't shared with any other thread group regardless of run order — so each is its own fully independent virtual user, same as a real one.

## Setup

1. Install a JDK (11+): https://adoptium.net/
2. Download Apache JMeter (5.6+): https://jmeter.apache.org/download_jmeter.cgi — unzip anywhere.
3. Verify: `<jmeter-folder>/bin/jmeter -v`

## Running

**Do not use GUI mode for the actual timed run** — GUI mode is only for building/debugging the plan. Always execute the real load test in non-GUI mode:

```bash
# from the repository root
<jmeter-folder>/bin/jmeter -n \
  -t performance/employee-lifecycle.jmx \
  -l performance/results/results.jtl \
  -e -o performance/results/html-report
```

- `-n` — non-GUI mode (the correct way to run a load test)
- `-l` — raw results file (`.jtl`)
- `-e -o` — generate JMeter's built-in interactive HTML Dashboard Report straight from this run, written to `performance/results/html-report/`

Open `performance/results/html-report/index.html` in a browser to see response-time graphs, throughput, and the pass/fail outcome of every threshold assertion.

## Note on values in this plan

The request bodies here follow the same internal API contract captured via Playwright's network interception in the E2E suite (see `utils/apiCapture.ts` and the README's "Key design decisions"). If the employee-creation payload needs an extra required field, capture the exact request via your browser's DevTools Network tab (or Playwright's trace viewer) while manually creating an employee, and adjust the JSON body in the "POST /api/v2/pim/employees" sampler accordingly.
