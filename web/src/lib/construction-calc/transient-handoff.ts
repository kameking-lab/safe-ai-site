/**
 * One-shot, same-tab handoff for calculator inputs extracted from free text.
 *
 * Values deliberately live only in module memory. They must never be copied
 * into a URL, history state, Web Storage, analytics, or logs.
 */
export type ConstructionCalcHandoff = {
  slug: string;
  values: Record<string, string | number>;
};

let pendingHandoff: ConstructionCalcHandoff | null = null;

function cloneHandoff(value: ConstructionCalcHandoff): ConstructionCalcHandoff {
  return {
    slug: value.slug,
    values: { ...value.values },
  };
}

export function putConstructionCalcHandoff(
  value: ConstructionCalcHandoff,
): void {
  pendingHandoff = cloneHandoff(value);
}

export function consumeConstructionCalcHandoff(
  slug: string,
): ConstructionCalcHandoff | null {
  if (!pendingHandoff || pendingHandoff.slug !== slug) return null;
  const value = pendingHandoff;
  pendingHandoff = null;
  return cloneHandoff(value);
}

export function clearConstructionCalcHandoffForTest(): void {
  pendingHandoff = null;
}
