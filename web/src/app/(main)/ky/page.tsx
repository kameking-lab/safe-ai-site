import { permanentRedirect } from "next/navigation";

const SAFE_QUERY_KEYS = new Set([
  "source",
  "area",
  "fromAccident",
  "accidentId",
  "accidentType",
  "workCategory",
  "scenario",
  "chemical",
  "cas",
  "preset",
  "template",
  "industry",
  "topic",
  "import",
]);

function safeQueryValue(value: string): boolean {
  return /^[a-z0-9][a-z0-9._:-]{0,79}$/u.test(value);
}

// Phase 7 / P1-C: KY入力を /ky/paper（用紙ファースト）に一本化。
// クロスツール連携のうちallowlist済みenum/public IDだけを /ky/paper へ保持する。
// 自由文・日誌ID・payloadはURLへ引き継がない。
export default async function KyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (!SAFE_QUERY_KEYS.has(key)) continue;
    const first = typeof value === "string" ? value : value?.[0];
    if (first && safeQueryValue(first)) qs.set(key, first);
  }
  const query = qs.toString();
  permanentRedirect(query ? `/ky/paper?${query}` : "/ky/paper");
}
