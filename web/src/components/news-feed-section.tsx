import { AlertTriangle, CheckCircle2, ExternalLink, Newspaper } from "lucide-react";
import {
  getRecentNewsFeedEntries,
  getNewsFeedCount,
  getNewsFeedUpdatedAt,
} from "@/lib/news-feed";

const MAX_VISIBLE = 12;

function formatDate(iso: string | undefined): string {
  if (!iso) return "日付不明";
  const date = new Date(iso.trim());
  if (Number.isNaN(date.getTime())) return "日付不明";
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

/**
 * RSSの自動収集と公開承認を分離する。news-feed.ts 側でも
 * approved === true && humanReviewed === true を必須にしている。
 */
export function NewsFeedSection() {
  const entries = getRecentNewsFeedEntries(MAX_VISIBLE);
  if (entries.length === 0) return null;

  const total = getNewsFeedCount();
  const updatedLabel = formatDate(getNewsFeedUpdatedAt());

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-sm sm:p-5"
      aria-label="報道RSSの人手確認済み項目"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Newspaper className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-amber-950">
              報道RSS・人手確認済み
            </h2>
            <p className="mt-1 text-xs leading-5 text-amber-950/90">
              公開RSSの見出しを収集し、決定的な事前フィルターの後に運営者が出典と関連性を確認しています。
              未確認の項目は公開しません。外部生成AIによる自動判定・自動公開は行いません。{" "}
              <a href="/about/news-feed" className="font-bold underline hover:text-amber-950">
                収集・確認方法を見る
              </a>
            </p>
          </div>
        </div>
        <span className="inline-flex min-h-[28px] items-center rounded-full bg-amber-800 px-3 py-1 text-[11px] font-bold text-white">
          人手確認済み
        </span>
      </div>

      <p className="mt-2 text-[11px] text-amber-950/80">
        公開 {total}件 ／ 一覧更新 {updatedLabel} ／ 事故統計には含めません
      </p>

      <ul className="mt-3 space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-lg border border-amber-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <a
                href={entry.source.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex-1 text-sm font-semibold text-slate-950 underline-offset-2 hover:underline"
              >
                {entry.headline}
                <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-text-top text-slate-500" aria-hidden="true" />
              </a>
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-700">
                {formatDate(entry.source.publishedAt)}
              </span>
            </div>
            {entry.aiSummary ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-700">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-emerald-800">確認済み要約: </span>
                  {entry.aiSummary}
                </span>
              </p>
            ) : null}
            <p className="mt-2 text-[10px] leading-4 text-slate-600">
              出典: {entry.source.name}（{entry.source.publisher}）
              {entry.estimatedAccidentType ? ` / 参考分類: ${entry.estimatedAccidentType}` : ""}
              {entry.estimatedWorkCategory ? ` / 参考業種: ${entry.estimatedWorkCategory}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-[11px] leading-5 text-amber-950">
        <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
        掲載内容は速報性のある報道見出しです。判断や引用の前に、リンク先の一次情報と更新状況を必ず確認してください。
      </p>
    </section>
  );
}
