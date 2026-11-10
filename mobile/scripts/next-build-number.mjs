import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// reports/r-anz-{billing,guide,ux}.md (2026-11-10) identify submitted build 10.
// The live ASC result can be newer; never replace it with a fixed next number.
export function nextBuildNumber(latest) {
  if (typeof latest !== 'string' || latest.trim() !== latest || !/^\d+$/.test(latest)) {
    throw new Error('Expected a non-empty integer App Store Connect build number.');
  }
  const value = BigInt(latest);
  return ((value > 10n ? value : 10n) + 1n).toString();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(nextBuildNumber(process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
