export function ogImageUrl(title: string, desc?: string): string {
  const p = new URLSearchParams({ title });
  if (desc) p.set("desc", desc);
  return `/api/og?${p.toString()}`;
}
