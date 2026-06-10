import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * 折りたたみ詳細（共通視覚言語・柱0-0）。
 * 「文字ダイエット」の受け皿 — 段落・注意書き・法令説明は消さずにここへ格納する
 * （正確性は不可侵: 隠すのは可、消す・曖昧にするのは不可）。
 * <details> ベースなので JS 不要＝サーバーコンポーネントでもサイネージでも使える。
 * summary はタップ対象44px以上を部品側で保証。
 */

type CollapsibleDetailProps = {
  /** 見出し（短く。例「保存先とご利用上の注意」） */
  summary: ReactNode;
  children: ReactNode;
  /** 初期状態で開いておく場合 */
  defaultOpen?: boolean;
  className?: string;
};

export function CollapsibleDetail({
  summary,
  children,
  defaultOpen = false,
  className = "",
}: CollapsibleDetailProps) {
  return (
    <details
      open={defaultOpen || undefined}
      className={`group rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
        {summary}
      </summary>
      <div className="px-4 pb-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
        {children}
      </div>
    </details>
  );
}
