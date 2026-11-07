const MAX_AGE_MS = 15_000;
let armedUntil = 0;

/** Data-free, one-shot authorization for the home card's memory handoff. */
export function beginTransientChemicalNavigation(): void {
  armedUntil = Date.now() + MAX_AGE_MS;
}

export function isExactTransientChemicalUrl(value: string | URL | null | undefined): boolean {
  if (value == null) return false;
  try {
    const target = new URL(String(value), window.location.href);
    return target.origin === window.location.origin &&
      target.pathname === "/chemical-ra" && target.search === "" &&
      target.hash === "#chemical-ra-start";
  } catch {
    return false;
  }
}

export function consumeTransientChemicalNavigation(): boolean {
  const valid = armedUntil > 0 && armedUntil >= Date.now();
  armedUntil = 0;
  return valid;
}
