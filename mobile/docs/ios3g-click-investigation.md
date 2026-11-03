# IOS3G: deletion click investigation

The existing hydration gate remains necessary. It does not prevent an enabled
button from moving when billing, membership or SDS history is inserted above it.

A controlled test holds the membership response until pointer down on the start
button, then returns it during a 200 ms physical press. Against the previous
export, Desktop loses this first click: the button moves from viewport y=554.953
to y=784.953; pointer up hits the explanatory paragraph and click targets the
enclosing section. No delete preparation request is sent. The confirmation
assertion fails. This was observed twice, with traces retained.

The deletion panel now follows the static account heading, ahead of all
asynchronous membership content. No API completion is added to its availability
conditions. Hydration, busy state, confirmation, reauthentication and session
erasure remain unchanged. The added test checks one preparation request and an
unchanged button position while membership arrives during the press.

The original intermittent WebKit failure has **not** been reproduced in the
baseline experiments. The controlled layout failure is proven on Desktop; it
must not be reported as proof of the historical WebKit failure's exact cause.
Successful repetition alone cannot establish that connection. C4 is unchanged.

Run the original WebKit test with a new server/browser/context every iteration:

```powershell
cd mobile
node scripts/reproduce-account-deletion.mjs --output C:/path/to/new-evidence --runs 50 --input-events
```

Use `--runs 100 --stop-on-failure` for post-change verification and `--full
--runs 5 --stop-on-failure` for full-suite verification. Omit `--input-events`
to collect network/console/server logs without installing a page-side observer.
Output directories must be new. Each iteration saves JSON results, logs, PIDs,
source fingerprint, case manifest and port checks. Failures retain Playwright
trace, DOM and screenshot; optional input diagnostics retain event targets and
button geometry. Requests record paths/statuses, not credentials or payloads.
The child environment removes credential variables and blocks outbound Node
HTTP. Browser HTTPS is mocked or blocked by the tests.

No timeout increase, configured retry, forced click or existing test removal is
part of this change. The original 78 cases are retained; the additional press
test runs in all three projects, making 81 cases. The evidence and final counts
are recorded outside the repository in the requested IOS3G report.
