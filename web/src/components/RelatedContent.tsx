import Link from "next/link";
import type { RelatedContentItem } from "@/lib/related-content";

/**
 * 詳細ページ下部に「関連コンテンツ」を3列グリッドで表示する共通コンポーネント。
 *
 * - 通達・事故・保護具・記事を1グループずつ受け取る（最大3グループ）
 * - 0件のグループは表示しない
 * - 各グループは内部リンク 5〜10件
 */
export type RelatedContentGroup = {
  /** セクション見出し（例: 「関連する事故事例」） */
  heading: string;
  /** 1行の補足説明 */
  description?: string;
  /** カードのアクセントカラー（Tailwind JIT 対策で固定文字列） */
  accent: "emerald" | "amber" | "rose" | "sky";
  items: RelatedContentItem[];
  /** 「もっと見る」リンク（例: /accidents） */
  moreHref?: string;
  moreLabel?: string;
};

const ACCENT_MAP: Record<
  RelatedContentGroup["accent"],
  { border: string; badge: string; cta: string }
> = {
  emerald: {
    border: "border-emerald-200",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    cta: "text-emerald-700 hover:text-emerald-800",
  },
  amber: {
    border: "border-amber-200",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    cta: "text-amber-700 hover:text-amber-800",
  },
  rose: {
    border: "border-rose-200",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    cta: "text-rose-700 hover:text-rose-800",
  },
  sky: {
    border: "border-sky-200",
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    cta: "text-sky-700 hover:text-sky-800",
  },
};

interface RelatedContentProps {
  /** セクション全体の見出し（任意） */
  title?: string;
  groups: RelatedContentGroup[];
}

export function RelatedContent({
  title = "関連コンテンツ",
  groups,
}: RelatedContentProps) {
  const visible = groups.filter((g) => g.items.length > 0);
  if (visible.length === 0) return null;

  return (
    <section className="mt-8" aria-label={title}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <div className="mt-3 space-y-5">
        {visible.map((group) => {
          const accent = ACCENT_MAP[group.accent];
          return (
            <div
              key={group.heading}
              className={`rounded-2xl border ${accent.border} bg-white p-4 shadow-sm sm:p-5`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{group.heading}</h3>
                  {group.description ? (
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                      {group.description}
                    </p>
                  ) : null}
                </div>
                {group.moreHref ? (
                  <Link
                    href={group.moreHref}
                    className={`shrink-0 text-xs font-bold ${accent.cta} hover:underline`}
                  >
                    {group.moreLabel ?? "一覧を見る"} →
                  </Link>
                ) : null}
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => (
                  <li
                    key={`${item.kind}-${item.href}-${item.title}`}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${accent.badge}`}>
                        {item.category}
                      </span>
                      {item.badge ? (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={item.href}
                      className="mt-1 block text-xs font-semibold text-slate-900 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-600">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
