import { Clock, ArrowLeftRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";

/**
 * 在留資格ガイド詳細ページ（/foreign-workers/status/[status]）用の結論カード（柱0）。
 * 3秒無読で「この在留資格は何か（要約）」「就労制限・転職可否」「次にやること（多言語安全教育教材を見る）」を伝える。
 * 表示文言はページ既載のルールデータをそのまま使い、新たな法的主張は加えない（法令正確性は不可侵）。
 */

export function StatusConclusion({
  labelJa,
  summary,
  periodOfStay,
  unlimitedWorkScope,
  transferAllowed,
  className = "",
}: {
  labelJa: string;
  summary: string;
  periodOfStay: string;
  unlimitedWorkScope: boolean;
  transferAllowed: boolean;
  className?: string;
}) {
  return (
    <ConclusionCard
      tone="info"
      title={labelJa}
      description={summary}
      action={{ href: "/foreign-workers/safety-training", label: "多言語安全教育教材を見る" }}
      className={className}
    >
      <StatusBadge tone="neutral" icon={Clock}>
        {periodOfStay}
      </StatusBadge>
      <StatusBadge tone={unlimitedWorkScope ? "safe" : "warning"} icon={unlimitedWorkScope ? ShieldCheck : ShieldAlert}>
        {unlimitedWorkScope ? "就労制限なし" : "就労制限あり"}
      </StatusBadge>
      <StatusBadge tone={transferAllowed ? "safe" : "warning"} icon={ArrowLeftRight}>
        {transferAllowed ? "転職可能" : "転籍原則不可"}
      </StatusBadge>
    </ConclusionCard>
  );
}
