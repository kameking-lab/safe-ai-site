import type { ReactNode } from "react";
import {
  MascotGuide,
  type MascotGuideVariant,
} from "@/components/mascot-guide";
import type { MascotVariant } from "@/components/mascot";

type EmptyStateProps = {
  /** 状態の一言（例: 「まだ記録がありません」） */
  title: string;
  /** 次の一歩の説明（任意） */
  description?: string;
  /** CTA等（任意） */
  action?: ReactNode;
  /** マスコットのポーズ。空状態は thinking が既定 */
  variant?: MascotVariant;
  /** 案内の意味と配色。専用ポーズとは分けて指定できる。 */
  guideVariant?: MascotGuideVariant;
  className?: string;
};

/**
 * 統一空状態コンポーネント（視覚刷新キャンペーン 2026-07-12 新設）。
 * 各ページのインライン「〜がありません」を段階的にこれへ置換する。
 * マスコットは装飾（alt=""）でスクリーンリーダーには読ませない。
 */
export function EmptyState({
  title,
  description,
  action,
  variant = "thinking",
  guideVariant,
  className = "",
}: EmptyStateProps) {
  const resolvedGuideVariant =
    guideVariant ??
    (variant === "water-break" || variant === "seasonal-summer"
      ? "heat"
      : "default");

  return (
    <MascotGuide
      variant={resolvedGuideVariant}
      imageVariant={variant}
      title={title}
      message={description}
      action={action}
      className={`border-dashed ${className}`}
    />
  );
}
