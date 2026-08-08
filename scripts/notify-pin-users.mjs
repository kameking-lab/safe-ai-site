/**
 * Retired fail-closed entry point.
 *
 * Signage pins are stored only in the user's browser. There is no durable,
 * consent-audited recipient registry connected to this script, so reading
 * legacy pin files or sending/dry-running mail would create a false
 * notification expectation and could expose PII. Re-enable only with an
 * independently reviewed persistent adapter, consent record, unsubscribe
 * flow, idempotency, and delivery runbook.
 */

console.log(
  "[notify-pin-users] disabled: signage pins are local-only; no recipients were read and no messages were sent.",
);
