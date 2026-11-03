# IOS3E: C3 static release validation

The IOS3DR first desktop failure was a failed local dependency download, not a
fleet API response or a slow organization query. Its retained trace records
`net::ERR_NO_BUFFER_SPACE` for `3794-8755c8d143d8b86f.js` (242,889 bytes),
and no signage-fleet request. The `scope` DOM is the prerendered initial state;
without the dependency, hydration cannot restore the organization query.

Windows build 26200 / Playwright 1.64.1 / Chromium 156.0.8078.4 match the
affected environment described in [Playwright #43545](https://github.com/microsoft/playwright/issues/43545).
The precise historical Winsock event cannot be recovered without its NetLog.
The confirmed failure is the missing bundle; the Windows TCP randomization
mechanism is the matching upstream diagnosis, not a newly captured OS trace.

Backport [upstream #43605](https://github.com/microsoft/playwright/pull/43605/files)
in the Windows Chromium test launch options. Preserve all 18 disabled features
from pinned Playwright 1.64.1 and append `TcpPortRandomizationWin`. Fail closed
on a Playwright version change so a future upgrade requires revisiting the
backport. No OS settings or application behavior change. WebKit is unchanged.

`node --experimental-strip-types scripts/verify-browser-network.mjs <report.json>`
compares the baseline and effective Chromium process arguments via public
Playwright APIs. It verifies that every default is preserved and only the
intended feature is added. All E2E tests also attach local JS download failures;
unexpected network failures and HTTP errors fail the test explicitly.

Keep all 75 cases, three projects, three workers, retry zero, and existing
timeouts. Generate `out` from the committed source, complete both bundle and
parity checks, hash the entire output before and after three consecutive full
E2E invocations, and complete the normal Web build from the same HEAD.
Set `ANZEN_PARITY_REPORT` to an external evidence path to avoid modifying the
tracked historical parity snapshot during final-HEAD verification.

Store command start/end times, HEAD, exit codes, complete logs, and Playwright
JSON results outside the repository in the task's evidence directory. Keep the
requested `ios3e-report.md` there; do not commit user-local absolute paths.
C4 is outside this change. RA remains unavailable. No push or deployment.
