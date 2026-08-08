/**
 * Accident-to-chemical cross references are intentionally withheld.
 *
 * The local accident corpus has no individually verified primary-source
 * allowlist at present. Keep this compatibility component fail-closed so a
 * future or dormant import cannot expose unverified records.
 */
export function AccidentCrossSection(_props: {
  substanceName: string;
  aliases?: string[];
}) {
  return null;
}
