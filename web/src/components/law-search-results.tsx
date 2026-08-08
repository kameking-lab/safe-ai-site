"use client";

import { useEffect, useRef, useState } from "react";
import {
  allLawArticles,
  mhlwLawArticles,
  type LawArticle,
} from "@/data/laws";
import { SITE_STATS } from "@/data/site-stats";
import { SimpleMarkdown } from "@/components/simple-markdown";
import { useLanguage } from "@/contexts/language-context";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { getFreshPlainArticle } from "@/data/plain";
import { findEntryByShort } from "@/lib/law-navi/permalink";
import {
  searchLawArticles,
  type LawSearchHit,
} from "@/lib/law-search";
import {
  EGOV_LAW_SEARCH_URL,
  normalizeArticleQuery,
} from "@/lib/cross-search";

const quarantinedMhlwArticles = new Set<LawArticle>(mhlwLawArticles);
const searchableLawArticles = (() => {
  const seen = new Set<string>();
  return allLawArticles.filter((article) => {
    if (quarantinedMhlwArticles.has(article)) return false;
    const key = `${article.law}|${article.articleNum}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();
const LAW_NAMES = Array.from(
  new Set(searchableLawArticles.map((article) => article.law)),
);

const EGOV_LAW_NUMBERS: Record<string, string> = {
  "労働安全衛生法": "347AC0000000057",
  "労働基準法": "322AC0000000049",
  "じん肺法": "335AC0000000030",
  "労働安全衛生規則": "347M50002000032",
  "クレーン等安全規則": "347M50002000034",
  "有機溶剤中毒予防規則": "347M50002000036",
  "特定化学物質障害予防規則": "347M50002000039",
  "酸素欠乏症等防止規則": "347M50002000042",
  "ボイラー及び圧力容器安全規則": "347M50002000033",
  "ゴンドラ安全規則": "347M50002000035",
  "電離放射線障害防止規則": "347M50002000041",
  "粉じん障害防止規則": "354M50002000018",
  "石綿障害予防規則": "417M60000100021",
  "高気圧作業安全衛生規則": "347M50002000040",
  "事務所衛生基準規則": "347M50002000043",
  "労働者災害補償保険法": "322AC0000000050",
  "労働契約法": "419AC0000000128",
  "雇用機会均等法": "347AC0000000113",
  "育児介護休業法": "403AC0000000076",
  "建設業法": "324AC1000000100",
  "作業環境測定法": "350AC0000000028",
  "短時間労働者管理法": "405AC0000000076",
  "職業安定法": "322AC0000000141",
  "職業能力開発促進法": "344AC0000000064",
  "最低賃金法": "334AC0000000137",
};

function getEGovUrl(lawName: string): string | null {
  const lawNum = EGOV_LAW_NUMBERS[lawName];
  if (!lawNum) return null;
  return `https://laws.e-gov.go.jp/law/${lawNum}`;
}

function ArticleCard({
  hit,
  onSummarize,
}: {
  hit: LawSearchHit;
  onSummarize: (a: LawArticle) => void;
}) {
  const { article } = hit;
  const eGovUrl = getEGovUrl(article.law);
  // lawShort キーで法令ナビの生成集合を引く（「労働安全衛生規則（足場等）」等の
  // グルーピング表記でも lawShort は共通のため、EGOV_LAW_NUMBERS の未収載法令名でも解決する）。
  const naviEntry = findEntryByShort(article.lawShort, article.articleNum);
  const plain = naviEntry ? getFreshPlainArticle(naviEntry.egovLawId, article) : undefined;
  const plainHref = plain ? naviEntry?.path : undefined;
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            {article.lawShort}
          </span>
          <span className="text-[11px] text-slate-700">{article.articleNum}</span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${article.verificationStatus === "snapshot-hash-verified" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
            title={
              article.verificationStatus === "snapshot-hash-verified"
                ? isEn
                  ? "Stored text matched the official source when collected."
                  : "収録時に公式本文との一致を確認しています。"
                : isEn
                  ? "Confirm the official text before use."
                  : "利用前に公式本文を確認してください。"
            }
          >
            {article.verificationStatus === "snapshot-hash-verified"
              ? isEn
                ? "Text checked"
                : "本文確認済み"
              : isEn
                ? "Unverified"
                : "未確認"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {plainHref && (
            <a
              href={plainHref}
              className="min-h-[44px] inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition"
            >
              現場ことば版で読む
            </a>
          )}
          {eGovUrl && (
            <a
              href={eGovUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition"
            >
              e-Gov
            </a>
          )}
          <button
            type="button"
            onClick={() => onSummarize(article)}
            className="min-h-[44px] inline-flex items-center rounded-lg border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition"
          >
            {isEn ? "View portal copy" : "収録本文を表示"}
          </button>
        </div>
      </div>
      {article.articleTitle && (
        <p className="mt-1 text-sm font-bold text-slate-900">{article.articleTitle}</p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{article.text}</p>
      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-700">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 font-bold">一致箇所と確認状態</summary>
      <dl className="grid gap-1 border-t border-slate-200 p-3 sm:grid-cols-[8rem_1fr]">
        <dt className="font-bold">法的位置付け</dt>
        <dd>{article.law}の収録条文（適用可否は公式正本で確認）</dd>
        <dt className="font-bold">一致フィールド</dt>
        <dd>{hit.matchedFields.join("・")}</dd>
        <dt className="font-bold">一致抜粋</dt>
        <dd>{hit.matchedSnippet}</dd>
        <dt className="font-bold">対象時点・施行日</dt>
        <dd>施行状態未検証。e-Govの現行法令・附則で確認してください。</dd>
        <dt className="font-bold">検証状態</dt>
        <dd>
          {article.verificationStatus === "snapshot-hash-verified"
            ? "収録時の本文一致を確認（適用条件と施行状態は別途確認）"
            : "サイト収録"}
        </dd>
      </dl>
      </details>
      {article.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {article.keywords.map((kw) => (
            <span key={kw} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
              {kw}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function AiSummaryModal({
  article,
  onClose,
}: {
  article: LawArticle;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [summary, setSummary] = useState("");
  const { language } = useLanguage();
  const isEn = language === "en";
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // 開いた際に閉じるボタンへ初期フォーカス、閉じた際は開く直前にフォーカスがあった要素へ復帰
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function fetchSummary() {
    setStatus("loading");
    try {
      // GET（LN-S2）: 同一条文は同一URLに収束し Vercel エッジキャッシュが効く（POST は no-op）
      const res = await fetch(
        `/api/law-summary?law=${encodeURIComponent(article.law)}&articleNum=${encodeURIComponent(article.articleNum)}`
      );
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as { summary: string };
      setSummary(data.summary);
      setStatus("done");
    } catch {
      setSummary(
        `【サイト収録本文・自動解説ではありません】\n${article.articleTitle || article.articleNum}\n\n${article.text.slice(0, 1_200)}\n\n通信に失敗しました。現行の正本はe-Gov法令検索で確認してください。`
      );
      setStatus("done");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-summary-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">{article.lawShort} {article.articleNum}</p>
            <p id="ai-summary-title" className="text-sm font-bold text-slate-900">{article.articleTitle || (isEn ? "Portal copy" : "サイト収録本文")}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close this dialog" : "このダイアログを閉じる"}
            className="text-slate-600 hover:text-slate-900 text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            ×
          </button>
        </div>
        <div className="p-5">
          {status === "idle" && (
            <button
              type="button"
              onClick={fetchSummary}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700"
            >
              {isEn ? "Show portal copy" : "サイト収録本文を表示"}
            </button>
          )}
          {status === "loading" && (
            <p className="text-center text-sm text-slate-500 py-4">
              {isEn ? "Loading primary text..." : "原文を確認中..."}
            </p>
          )}
          {status === "done" && (
            <>
              <SimpleMarkdown content={summary} className="text-sm leading-relaxed text-slate-700" />
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
                {isEn
                  ? "* This is not an AI explanation. Confirm scope, related provisions, and amendments in the authoritative e-Gov text."
                  : "※ これはAI解説ではありません。適用範囲、関連条文、改正履歴はe-Gov法令検索の正本で確認してください。"}
              </p>
            </>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600">{isEn ? "An error occurred." : "エラーが発生しました。"}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function LawSearchResults({
  query,
  articleNumQuery,
  selectedLaw,
  setSelectedLaw,
  isEn,
}: {
  query: string;
  articleNumQuery: string;
  selectedLaw: string;
  setSelectedLaw: (law: string) => void;
  isEn: boolean;
}) {
  const [summaryTarget, setSummaryTarget] = useState<LawArticle | null>(null);

  const combinedQuery = [query, articleNumQuery].filter(Boolean).join(" ");
  const articleFilter = normalizeArticleQuery(articleNumQuery);
  const filteredHits = searchLawArticles(
    searchableLawArticles,
    combinedQuery,
    selectedLaw,
  ).filter(
    (hit) =>
      !articleFilter ||
      normalizeArticleQuery(hit.article.articleNum).includes(articleFilter),
  );
  const filtered = filteredHits.map((hit) => hit.article);

  return (
    <>
      {/* 結論カード: いまの状態=ヒット件数をデカ数字で（柱0ビジュアルファースト） */}
      {filtered.length > 0 ? (
        <ConclusionCard
          tone="info"
          value={filtered.length.toLocaleString(isEn ? "en-US" : "ja-JP")}
          unit={isEn ? "" : "件"}
          title={isEn ? "articles" : "該当"}
          description={
            isEn
              ? `from ${SITE_STATS.lawArticleCount} portal-indexed excerpts`
              : `全${SITE_STATS.lawArticleCount}条文から検索`
          }
        />
      ) : (
        <ConclusionCard
          tone="warning"
          title={isEn ? "No matches" : "該当なし"}
          description={
            isEn
              ? "Loosen your keyword, article number, or law filter."
              : "キーワード・条番号・法令の絞り込みを緩めてください。"
          }
        />
      )}

      <div className="grid gap-1.5 sm:max-w-md">
        <label
          htmlFor="law-search-law-filter"
          className="text-xs font-bold text-slate-700"
        >
          {isEn ? "Filter by law" : "法令で絞り込む"}
        </label>
        <select
          id="law-search-law-filter"
          value={selectedLaw}
          onChange={(event) => setSelectedLaw(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <option value="all">{isEn ? "All laws" : "すべての法令"}</option>
          {LAW_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filteredHits.slice(0, 50).map((hit) => (
          <ArticleCard key={hit.stableKey} hit={hit} onSummarize={setSummaryTarget} />
        ))}
        {filtered.length > 50 && (
          <p className="text-center text-xs text-slate-500">
            {isEn
              ? `Showing top 50. Narrow your search to see the remaining ${filtered.length - 50}.`
              : `上位50件を表示。検索を絞り込んでください（残り${filtered.length - 50}件）`}
          </p>
        )}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950">
            <p>{isEn ? "No articles found." : "サイト収録条文では見つかりませんでした。"}</p>
            <a
              href={EGOV_LAW_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-blue-700 px-4 py-2 font-bold text-white"
            >
              e-Gov法令検索で公式正本を探す
            </a>
            <p className="mt-2 text-xs">
              外部サイトへ移動します。検索語「{combinedQuery || "（未入力）"}」を再入力してください。
            </p>
          </div>
        )}
      </div>

      {summaryTarget && (
        <AiSummaryModal article={summaryTarget} onClose={() => setSummaryTarget(null)} />
      )}
    </>
  );
}
