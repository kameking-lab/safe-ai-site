import { SITE_STATS_META, type SiteStatKey } from "@/data/site-stats";

/**
 * SITE_STATS の数字に「出典」リンクを 1 行で添える小コンポーネント。
 *
 * 「869通達」「4257事故」「504,415件」のような目立つ数字が、ページ上で
 * 出典なしで表示されているとユーザーから疑念を招くため、
 * 数字の直下に source / asOf / sourceUrl を露出させる。
 */
export function StatSourceCite({
  statKey,
  className = "",
}: {
  statKey: SiteStatKey;
  className?: string;
}) {
  const meta = SITE_STATS_META[statKey];
  if (!meta) return null;
  return (
    <p className={`text-[9px] leading-4 text-slate-400 ${className}`}>
      出典:{" "}
      {meta.sourceUrl ? (
        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          {meta.source}
        </a>
      ) : (
        <span>{meta.source}</span>
      )}
      （取得 {meta.asOf}）
    </p>
  );
}
