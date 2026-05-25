import { permanentRedirect } from "next/navigation";

// Phase 7 / P1-C: KY入力を /ky/paper（用紙ファースト）に一本化。
// クロスツール連携クエリ（preset/industry/topic/fromAccident/fromDiary/import 等）は
// /ky/paper の取り込みハンドラへ引き継ぐため、クエリを保持して恒久リダイレクトする。
export default async function KyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) for (const v of value) qs.append(key, v);
  }
  const query = qs.toString();
  permanentRedirect(query ? `/ky/paper?${query}` : "/ky/paper");
}
