export function ogImageUrl(title: string, desc?: string, lang?: "ja" | "en"): string {
  const p = new URLSearchParams({ title });
  if (desc) p.set("desc", desc);
  if (lang && lang !== "ja") p.set("lang", lang);
  return `/api/og?${p.toString()}`;
}
