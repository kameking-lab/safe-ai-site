# IOS3F: account deletion readiness

The exported account page previously rendered enabled deletion buttons before
React had installed their handlers. Playwright's normal actionability check
only observes the DOM; `goto`'s load event does not guarantee React hydration.
An early successful click could therefore send no preparation request and leave
the confirmation field absent indefinitely. Increasing the fill timeout cannot
recover an already lost click.

On the pre-fix static output, hold local JavaScript responses in WebKit, click
the enabled start button, and then release the responses. The member view
hydrates, but there are zero deletion requests and no confirmation field. A
second click sends exactly one prepare request and shows the field. This
isolates the UI readiness boundary from the deletion API and session cleanup.
The historical review trace has the same no-request symptom, but did not
instrument hydration; its precise scheduler interleaving cannot be recovered.

The deletion panel now prerenders disabled controls and a preparation message.
Its mount effect enables controls after handlers and the session-change
listener are installed. Readiness is independent of billing API success. The
existing busy state still covers asynchronous preparation, and confirmation is
still required. Session binding, receipts and erasure logic are unchanged.

The added E2E case holds scripts, verifies all initial deletion controls are
disabled, issues one ordinary click, releases scripts, and then holds the
prepare response. It verifies one request, disabled controls and no confirmation
field while pending, then confirmation entry and cancellation after the response.
No explicit sleep, forced click, readiness-only test selector, timeout extension
or retry is used. The same new test fails on the old export in all three
projects. All existing cases remain unchanged, giving 78 cases in total.

Acceptance: build from the committed final HEAD; finish static export, boundary
and parity checks; hash the entire output; execute the complete suite in five
separate fresh Playwright/server/browser processes, each with three workers,
retry zero and the existing timeouts; require all 78 first-attempt passes in
each invocation; stop on any failure. Hash output again and require equality.
Retain per-process commands, HEAD, status, times, PIDs, logs and JSON results
outside the repository. C4/RA is out of scope. No push or deployment.
