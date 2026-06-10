import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Minus } from "lucide-react";
import { SAFETY_TONE, type SafetyTone } from "@/lib/design/safety-tone";

/**
 * 状態バッジ（共通視覚言語・柱0-0）。
 * 色＋アイコン＋短いラベル（漢字2〜4文字目安）で状態を1秒で伝える。
 * 色だけに頼らないため、アイコンは省略時もトーン既定のものを必ず表示する。
 */

export const TONE_DEFAULT_ICON: Record<SafetyTone, LucideIcon> = {
  danger: AlertOctagon,
  warning: AlertTriangle,
  safe: CheckCircle2,
  info: Info,
  neutral: Minus,
};

type StatusBadgeProps = {
  tone: SafetyTone;
  children: ReactNode;
  /** トーン既定アイコンを差し替える場合のみ指定 */
  icon?: LucideIcon;
  /** soft=淡色（既定） / solid=濃色塗り（強調したい時） */
  variant?: "soft" | "solid";
  /** sm=リスト行内 / md=見出し横（既定） */
  size?: "sm" | "md";
  className?: string;
};

export function StatusBadge({
  tone,
  children,
  icon,
  variant = "soft",
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const t = SAFETY_TONE[tone];
  const Icon = icon ?? TONE_DEFAULT_ICON[tone];
  const sizeClass =
    size === "sm" ? "px-1.5 py-0.5 text-[10px] gap-1" : "px-2.5 py-1 text-xs gap-1.5";
  const toneClass = variant === "solid" ? t.solid : `border ${t.soft}`;
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${sizeClass} ${toneClass} ${className}`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden="true" />
      {children}
    </span>
  );
}
