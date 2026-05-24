import { ExternalLink, ShieldAlert } from "lucide-react";
import {
  REGULATION_TAGS,
  normalizeTags,
  TAG_CATEGORY_ORDER,
  TAG_CATEGORY_LABELS,
  type RegulationTag,
  type RegulationTagCategory,
} from "@/lib/regulation-tag-labels";
import type { ConcentrationLimitEntry } from "@/lib/mhlw-chemicals";

/**
 * 物質詳細ページ・RA カードに埋め込む「関連法令」セクション。
 *
 * - `regulationTags` が空または未定義の場合は何も描画しない (null)
 * - タグはカテゴリ別 (nite / prtr / chashin / poison-waste / cwc) でグルーピング
 * - 各タグごとに 法令正式名・1-2行要約・公式 URL を表示
 * - 法令別表参照 (prtrLawReferences / chashinLawReferences) があれば併記
 */
export function RegulationTagsSection({
  entry,
  variant = "card",
}: {
  entry: Pick<
    ConcentrationLimitEntry,
    | "regulationTags"
    | "niteChripUrl"
    | "prtrUrl"
    | "prtrLawReferences"
    | "chashinLawReferences"
  >;
  variant?: "card" | "page";
}) {
  const tags = normalizeTags(entry.regulationTags);
  if (tags.length === 0) return null;

  // カテゴリ別にグルーピング
  const byCategory = new Map<RegulationTagCategory, RegulationTag[]>();
  for (const t of tags) {
    const cat = REGULATION_TAGS[t].category;
    const list = byCategory.get(cat) ?? [];
    list.push(t);
    byCategory.set(cat, list);
  }

  const headerClass =
    variant === "page"
      ? "text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
      : "text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2";
  const sectionClass =
    variant === "page"
      ? "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-4"
      : "rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-3";

  return (
    <section className={sectionClass} aria-labelledby="regulation-tags-heading">
      <h2 id="regulation-tags-heading" className={headerClass}>
        <ShieldAlert className="w-5 h-5" aria-hidden="true" />
        関連法令 ({tags.length} 件)
      </h2>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        本物質に該当する規制法令一覧。詳細は各公式リンクから確認してください。
      </p>
      <div className="space-y-3">
        {TAG_CATEGORY_ORDER.map((cat) => {
          const catTags = byCategory.get(cat);
          if (!catTags || catTags.length === 0) return null;
          return (
            <div key={cat} className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {TAG_CATEGORY_LABELS[cat]}
              </h3>
              <ul className="space-y-2">
                {catTags.map((t) => {
                  const info = REGULATION_TAGS[t];
                  // タグごとの URL 補完: prtr1/prtr2 → prtrUrl 優先, nite → niteChripUrl 優先
                  let resolvedUrl = info.officialUrl;
                  if ((t === "prtr1" || t === "prtr2") && entry.prtrUrl) {
                    resolvedUrl = entry.prtrUrl;
                  }
                  if (t === "nite" && entry.niteChripUrl) {
                    resolvedUrl = entry.niteChripUrl;
                  }
                  const refList =
                    (t === "prtr1" || t === "prtr2"
                      ? entry.prtrLawReferences
                      : t.startsWith("cscl") ||
                          t === "poison-control" ||
                          t === "cwc" ||
                          t === "waste"
                        ? entry.chashinLawReferences
                        : undefined) ?? [];
                  return (
                    <li
                      key={t}
                      className={`rounded-lg border p-3 space-y-1.5 ${info.badgeClass} bg-opacity-30`}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold text-sm">
                          {info.fullLabel}
                        </span>
                        <a
                          href={resolvedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs underline hover:no-underline"
                        >
                          公式参照
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                        {info.summary}
                      </p>
                      {refList.length > 0 && (
                        <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                          {refList.slice(0, 3).map((r) => (
                            <li key={r}>
                              <span className="font-mono">{r}</span>
                            </li>
                          ))}
                          {refList.length > 3 && (
                            <li className="italic">
                              他 {refList.length - 3} 件
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
