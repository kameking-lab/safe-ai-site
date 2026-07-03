"use client";

import { useEffect, useState } from "react";
import { allLawArticles, type LawArticle } from "@/data/laws";
import { SITE_STATS } from "@/data/site-stats";
import { SimpleMarkdown } from "@/components/simple-markdown";
import { useLanguage } from "@/contexts/language-context";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { CopyCitationButton } from "@/components/favorites/copy-citation-button";
import { formatArticleCitation } from "@/lib/favorites";
import { ConclusionCard } from "@/components/ui/conclusion-card";

/** 漢数字を算用数字に変換（例: 第二十一条 → 第21条） */
function kanjiToNum(str: string): string {
  const kanjiMap: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9, 〇: 0,
    十: 10, 百: 100, 千: 1000,
  };

  return str.replace(/[一二三四五六七八九〇十百千]+/g, (match) => {
    let result = 0;
    let current = 0;
    for (const ch of match) {
      const val = kanjiMap[ch] ?? 0;
      if (val >= 10) {
        result += (current || 1) * val;
        current = 0;
      } else {
        current = val;
      }
    }
    result += current;
    return result > 0 ? String(result) : match;
  });
}

/** 検索クエリの正規化（漢数字→算用数字、全角→半角） */
function normalizeQuery(q: string): string {
  return kanjiToNum(
    q
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .toLowerCase()
  );
}

function normalizeArticle(a: LawArticle): string {
  return normalizeQuery([a.law, a.lawShort, a.articleNum, a.articleTitle, a.text, ...a.keywords].join(" "));
}

const LAW_NAMES = Array.from(new Set(allLawArticles.map((a) => a.law)));

const EGOV_LAW_NUMBERS: Record<string, string> = {
  "労働安全衛生法": "347AC0000000057",
  "労働基準法": "322AC0000000049",
  "じん肺法": "335AC0000000030",
  "労働安全衛生規則": "347M50002000032",
  "クレーン等安全規則": "347M50002000034",
  "有機溶剤中毒予防規則": "347M50002000036",
  "特定化学物質障害予防規則": "347M50002000040",
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

function ArticleCard({ article, onSummarize }: { article: LawArticle; onSummarize: (a: LawArticle) => void }) {
  const eGovUrl = getEGovUrl(article.law);
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            {article.lawShort}
          </span>
          <span className="text-[11px] text-slate-500">{article.articleNum}</span>
          {/* 出典区別バッジ：キュレーション条文は現行版（e-Gov準拠）として表示 */}
          <span
            className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
            title={isEn ? "Curated articles. Article numbers and text match the current e-Gov version." : "本サイトのキュレーション条文。現行版（e-Gov準拠）の条番号・条文を採録しています。"}
          >
            <span aria-hidden>●</span> {isEn ? "Current (e-Gov-aligned)" : "現行（e-Gov準拠）"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {eGovUrl && (
            <a
              href={eGovUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition"
            >
              e-Gov
            </a>
          )}
          <button
            type="button"
            onClick={() => onSummarize(article)}
            className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 transition"
          >
            {isEn ? "AI summary" : "AI要約"}
          </button>
          {/* P0-016 (usability-audit-day3): 条文の引用コピー + お気に入り */}
          <CopyCitationButton
            text={formatArticleCitation({
              text: article.text,
              lawShort: article.lawShort,
              lawFull: article.law,
              articleNum: article.articleNum,
              egovUrl: eGovUrl ?? undefined,
            })}
          />
          <FavoriteButton
            kind="article"
            id={`${article.law}|${article.articleNum}`}
            title={article.articleTitle ?? article.articleNum}
            subtitle={`${article.lawShort} ${article.articleNum}`}
            href={`/law-search?law=${encodeURIComponent(article.lawShort)}&art=${encodeURIComponent(article.articleNum)}`}
          />
        </div>
      </div>
      {article.articleTitle && (
        <p className="mt-1 text-sm font-bold text-slate-900">{article.articleTitle}</p>
      )}
      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{article.text}</p>
      {article.keywords.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {article.keywords.map((kw) => (
            <span key={kw} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function fetchSummary() {
    setStatus("loading");
    try {
      const res = await fetch("/api/law-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ law: article.law, articleNum: article.articleNum, text: article.text }),
      });
      if (!res.ok) throw new Error("API error");
      const data = (await res.json()) as { summary: string };
      setSummary(data.summary);
      setStatus("done");
    } catch {
      setSummary(
        `【フォールバック要約】\n${article.articleTitle || article.articleNum}：${article.text.slice(0, 120)}…\n\n（AI API未設定またはエラーのため簡易要約を表示しています）`
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
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">{article.lawShort} {article.articleNum}</p>
            <p id="ai-summary-title" className="text-sm font-bold text-slate-900">{article.articleTitle || (isEn ? "AI summary" : "AI要約")}</p>
          </div>
          <button
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
              {isEn ? "Generate AI summary" : "AI要約を生成する"}
            </button>
          )}
          {status === "loading" && (
            <p className="text-center text-sm text-slate-500 py-4">
              {isEn ? "Generating summary..." : "要約生成中..."}
            </p>
          )}
          {status === "done" && (
            <>
              <SimpleMarkdown content={summary} className="text-sm leading-relaxed text-slate-700" />
              <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
                {isEn
                  ? "* This summary is AI-generated. For the authoritative text, confirm on e-Gov."
                  : "※ この要約はAIが生成したものです。正確な内容はe-Gov法令検索で原文をご確認ください。"}
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

  const nq = normalizeQuery(query);
  const nart = normalizeQuery(articleNumQuery);
  const filtered = allLawArticles.filter((a) => {
    if (selectedLaw !== "all" && a.law !== selectedLaw) return false;
    if (nart && !normalizeQuery(a.articleNum).includes(nart)) return false;
    if (nq) {
      const haystack = normalizeArticle(a);
      return haystack.includes(nq);
    }
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedLaw("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            selectedLaw === "all"
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {isEn ? "All laws" : "すべての法令"}
        </button>
        {LAW_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSelectedLaw(name)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              selectedLaw === name
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 結論カード: いまの状態=ヒット件数をデカ数字で（柱0ビジュアルファースト） */}
      {filtered.length > 0 ? (
        <ConclusionCard
          tone="info"
          value={filtered.length.toLocaleString(isEn ? "en-US" : "ja-JP")}
          unit={isEn ? "" : "件"}
          title={isEn ? "articles" : "該当"}
          description={
            isEn
              ? `of ${SITE_STATS.lawArticleCount} curated articles`
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

      <div className="space-y-4">
        {filtered.slice(0, 50).map((a, i) => (
          <ArticleCard key={`${a.law}-${a.articleNum}-${i}`} article={a} onSummarize={setSummaryTarget} />
        ))}
        {filtered.length > 50 && (
          <p className="text-center text-xs text-slate-500">
            {isEn
              ? `Showing top 50. Narrow your search to see the remaining ${filtered.length - 50}.`
              : `上位50件を表示。検索を絞り込んでください（残り${filtered.length - 50}件）`}
          </p>
        )}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            {isEn ? "No articles found." : "条文が見つかりませんでした。"}
          </p>
        )}
      </div>

      {summaryTarget && (
        <AiSummaryModal article={summaryTarget} onClose={() => setSummaryTarget(null)} />
      )}
    </>
  );
}
