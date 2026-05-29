import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";
import {
  filterSeriousCases,
  getSeriousCaseFilters,
  SERIOUS_CASES_META,
} from "@/lib/accident-news/serious-cases";
import { AccidentNewsFilter } from "./accident-news-filter";

export const metadata: Metadata = {
  title: "重大災害事例ブラウザ｜業種・作業・原因で類型検索（無料・出典付き）",
  description:
    "厚労省 死亡災害データベース（匿名・公表事実）を業種・事故型・原因・年で類型検索。同種事故の頻度も表示し、労働安全コンサルの説明資料・パターン学習に。全件出典付き・登録不要。",
  alternates: { canonical: "/accident-news" },
  openGraph: {
    title: "重大災害事例ブラウザ｜業種・作業・原因で類型検索",
    description: "厚労省 死亡災害DB（匿名・公表事実）を類型検索。同種事故頻度・出典付き・無料・登録不要。",
    images: [{ url: ogImageUrl("重大災害事例ブラウザ"), width: 1200, height: 630 }],
  },
};

export const revalidate = 86400;

export default async function AccidentNewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const selected = {
    industry: pick("industry"),
    type: pick("type"),
    year: pick("year"),
    q: pick("q"),
  };
  const options = getSeriousCaseFilters();
  const cases = filterSeriousCases({
    industry: selected.industry || undefined,
    type: selected.type || undefined,
    year: selected.year ? Number(selected.year) : undefined,
    q: selected.q || undefined,
    limit: 120,
  });

  return (
    <PageContainer width="wide">
      <PageJsonLd
        name="重大災害事例ブラウザ"
        description="厚労省 死亡災害データベース（匿名・公表事実）を業種・事故型・原因・年で類型検索。"
        path="/accident-news"
      />
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">重大災害事例ブラウザ</h1>
        <p className="mt-1 text-sm text-slate-600">
          厚労省の死亡災害データ（公表事実・匿名）を業種・事故型・原因・年で検索できます。
          同業種・同種事故の傾向把握や、安全教育・説明資料の作成にご活用ください。
          <span className="font-semibold">会社名・発注者名は扱いません</span>（公表事実の引用に留めています）。
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Link href="/accidents-analytics" className="font-semibold text-emerald-700 hover:underline">
            事故統計ダッシュボードへ →
          </Link>
          <Link href="/accidents" className="font-semibold text-emerald-700 hover:underline">
            事故事例DBへ →
          </Link>
          <Link href="/whats-new" className="font-semibold text-emerald-700 hover:underline">
            新着情報ハブへ →
          </Link>
        </div>
      </header>

      <AccidentNewsFilter options={options} selected={selected} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600" aria-live="polite">
          該当 <span className="font-bold text-emerald-700">{cases.length}</span> 件（最大120件表示）
        </p>
        {/* P1-3: 現在の絞り込みで説明資料（A4印刷）を作成 */}
        <Link
          href={`/accident-news/print${(() => {
            const p = new URLSearchParams();
            if (selected.industry) p.set("industry", selected.industry);
            if (selected.type) p.set("type", selected.type);
            if (selected.year) p.set("year", selected.year);
            if (selected.q) p.set("q", selected.q);
            const qs = p.toString();
            return qs ? `?${qs}` : "";
          })()}`}
          className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
        >
          🖨 説明資料を印刷（この絞り込みで）
        </Link>
      </div>

      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {cases.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {c.type && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">{c.type}</span>
              )}
              {c.industry && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-800">{c.industry}</span>
              )}
              <span className="text-slate-500">
                {c.year}年{c.month ? `${c.month}月` : ""}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-slate-800">{c.description}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              {c.cause && <span>原因: {c.cause}</span>}
              {c.workplaceSize && <span>規模: {c.workplaceSize}</span>}
              {c.type && c.sameTypeTotal > 0 && (
                <span className="font-semibold text-rose-700">同種事故 収録{c.sameTypeTotal}件</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px]">
              <Link
                href={`/chatbot?q=${encodeURIComponent(`${c.industry ?? ""}の${c.type ?? "災害"}を防ぐための労働安全衛生法上の措置と関連条文は？`)}`}
                className="font-semibold text-blue-700 hover:underline"
              >
                AIに対策を質問 →
              </Link>
              <Link
                href={`/ky/paper?context=accidents&work=${encodeURIComponent(`${c.industry ?? ""} ${c.type ?? ""}`.trim())}`}
                className="font-semibold text-emerald-700 hover:underline"
              >
                KYに活かす →
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {cases.length === 0 && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          該当する事例がありません。条件を変えてお試しください。
        </p>
      )}

      <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
        出典:{" "}
        <a href={SERIOUS_CASES_META.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {SERIOUS_CASES_META.sourceLabel}
        </a>
        （収録 {SERIOUS_CASES_META.total.toLocaleString()} 件・公表事実の匿名データ）。
        本ブラウザは公表事実の引用であり、会社名・発注者名・被災者氏名は扱いません。最新・正確な情報は出典の公式DBでご確認ください。
        個別の対策判断は労働安全コンサルタント等の専門家にご相談ください。
      </p>
    </PageContainer>
  );
}
