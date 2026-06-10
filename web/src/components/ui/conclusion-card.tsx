import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";
import { TONE_DEFAULT_ICON } from "./status-badge";

/**
 * 結論カード（共通視覚言語・柱0-0）。
 * 画面の最上部に置く「いまの状態」1メッセージ: 色帯＋デカ数字（またはデカアイコン）＋漢字短ラベル。
 * 無読テストの主役 — 本文を読まずに3秒で「いまの状態」と「次にやること」が分かることが役目。
 *
 * 使い方の約束:
 * - 1画面に1枚だけ。複数の状態があるときは dominantTone() で最も重い1つに絞る。
 * - title は漢字2〜6文字目安の体言止め（例「期限超過」「対応済み」「警報なし」）。
 * - 次にやることがあるなら action を必ず付ける（タップ対象44px以上は部品側で保証）。
 */

type ConclusionCardProps = {
  tone: SafetyTone;
  /** デカ数字。省略時はトーンのデカアイコンが主役になる */
  value?: number | string;
  /** value の単位（件・%など） */
  unit?: string;
  /** 状態の短ラベル（体言止め） */
  title: string;
  /** 1行だけの補足（段落は書かない。詳しい説明は CollapsibleDetail へ） */
  description?: string;
  /** 次にやること（44px以上のタップ対象として描画） */
  action?: { href: string; label: string };
  icon?: LucideIcon;
  /** 補助チップ列など（StatusBadge を想定） */
  children?: ReactNode;
  className?: string;
};

export function ConclusionCard({
  tone,
  value,
  unit,
  title,
  description,
  action,
  icon,
  children,
  className = "",
}: ConclusionCardProps) {
  const t = SAFETY_TONE[tone];
  const Icon = icon ?? TONE_DEFAULT_ICON[tone];
  const hasValue = value !== undefined && value !== null;
  return (
    <section
      role="status"
      aria-label={`いまの状態: ${title}`}
      className={`rounded-2xl border-2 ${t.soft} p-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Icon
            className={`${hasValue ? "h-8 w-8" : "h-12 w-12"} shrink-0 ${t.icon}`}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            {hasValue && (
              <span className={`text-5xl font-bold leading-none tracking-tight ${t.text}`}>
                {value}
                {unit && <span className="ml-0.5 text-xl font-bold">{unit}</span>}
              </span>
            )}
            <span className="text-xl font-bold leading-tight">{title}</span>
          </div>
        </div>
        {action && (
          <Link
            href={action.href}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition hover:opacity-90 ${t.solid}`}
          >
            {action.label}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {description && <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>}
      {children && <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>}
    </section>
  );
}
