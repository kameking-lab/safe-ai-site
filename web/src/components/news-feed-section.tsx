import { Radio, ExternalLink, Bot } from "lucide-react";
import {
  getRecentNewsFeedEntries,
  getNewsFeedCount,
  getNewsFeedUpdatedAt,
} from "@/lib/news-feed";

const MAX_VISIBLE = 12;

function formatDate(iso: string | undefined): string {
  if (!iso) return "日付不明";
  const trimmed = iso.trim();
  // RSS pubDate (RFC 822) and ISO 8601 are both accepted by Date.
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed.slice(0, 16);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 「報道・自動収集」セクション。
 *
 * - 公的事故事例DB (mhlw / curated / preliminary) と視覚的に明確に区別するため
 *   オレンジ系の警告ボックスで囲む。
 * - 各エントリは「見出し + AI独自要約（50字以内） + 出典名 + 配信日」のみ表示し、
 *   見出し本文は必ず一次ソース URL へ外部遷移するリンクとする
 *   （引用法32条の主従関係・出典明示要件を遵守）。
 * - エントリ 0 件のときはセクションごと非表示（CI 直後・新規 deploy 直後の状態）。
 */
export function NewsFeedSection() {
  const entries = getRecentNewsFeedEntries(MAX_VISIBLE);
  if (entries.length === 0) return null;

  const total = getNewsFeedCount();
  const updatedAt = getNewsFeedUpdatedAt();
  const updatedLabel = formatDate(updatedAt);

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 shadow-sm sm:p-5"
      aria-label="報道・自動収集セクション"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Radio
            className="mt-0.5 h-5 w-5 shrink-0 text-orange-700"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-base font-bold text-orange-900">
              📰 報道・自動収集（AI判定ゲート通過）
            </h2>
            <p className="mt-0.5 text-xs text-orange-900/80">
              NHK NEWS WEB および厚労省記者発表の RSS から労働災害関連の見出しを
              AI が自動収集・自動判定し、関連性 70 以上 / 著作権リスク 30 以下 /
              誤情報リスク 30 以下 / 重複度 50 以下 をすべて満たした見出しのみを掲載しています。
              <strong> 本セクションは完全自動運用です（人的レビューは行われていません）。</strong>
              詳細は{" "}
              <a
                href="/about/news-feed"
                className="underline hover:text-orange-950"
              >
                自動収集の運用について
              </a>{" "}
              を参照。
            </p>
          </div>
        </div>
        <span className="rounded-full bg-orange-700 px-2 py-0.5 text-[10px] font-bold text-white">
          AI判定 自動公開
        </span>
      </div>

      <p className="mt-2 text-[11px] text-orange-900/80">
        収録 {total} 件 ／ 最終更新 {updatedLabel} ／ 集計対象外（
        <a href="/accidents-analytics" className="underline hover:text-orange-950">
          事故統計ダッシュボード
        </a>
        には含まれません）
      </p>

      <ul className="mt-3 space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-lg border border-orange-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <a
                href={entry.source.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex-1 text-sm font-semibold text-slate-900 hover:underline"
              >
                {entry.headline}
                <ExternalLink
                  className="ml-1 inline h-3.5 w-3.5 align-text-top text-slate-500"
                  aria-hidden="true"
                />
              </a>
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                {formatDate(entry.source.publishedAt)}
              </span>
            </div>
            {entry.aiSummary ? (
              <p className="mt-1 flex items-start gap-1 text-[12px] text-slate-700">
                <Bot
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-semibold text-orange-700">AI要約: </span>
                  {entry.aiSummary}
                </span>
              </p>
            ) : null}
            <p className="mt-1 text-[10px] text-slate-500">
              出典: {entry.source.name}（{entry.source.publisher}）
              {entry.estimatedAccidentType ? (
                <>
                  {" / "}
                  推定事故型: {entry.estimatedAccidentType}
                </>
              ) : null}
              {entry.estimatedWorkCategory ? (
                <>
                  {" / "}
                  推定業種: {entry.estimatedWorkCategory}
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-md border border-orange-200 bg-white px-2.5 py-1.5 text-[10px] text-orange-900/80">
        ⚠ 本セクションのエントリは AI が自動判定して公開しています。
        正確性は出典元（NHK・厚労省）の一次ソースをご確認ください。
        引用法 32 条に基づき見出し + 出典URL + 独自要約のみを掲載し、本文は転載していません。
      </p>
    </section>
  );
}
