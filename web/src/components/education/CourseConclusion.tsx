import { Clock, GraduationCap, Scale } from "lucide-react";
import { ConclusionCard } from "@/components/ui/conclusion-card";
import { StatusBadge } from "@/components/ui/status-badge";

/**
 * 教育コース（特別教育・法定教育・労働衛生教育）詳細ページ用の結論カード（柱0）。
 * 3秒無読で「これは何の教育か（区分）」「どれくらいか（時間）」「次にやること（サンプル資料を見る）」を伝える。
 *
 * 各ページに散っていたヘッダーの小チップ（区分・時間）に対し、最重要の次操作
 * （サンプル資料ダウンロードへの誘導）は本文下部に埋もれていた。本カードで最上部へ集約する。
 * 区分の表示文言はページ既載のものと一致させ、新たな法的主張は加えない（法令正確性は不可侵）。
 */

export type CourseKind = "special" | "legal" | "health";

const KIND_LABEL: Record<CourseKind, string> = {
  special: "特別教育",
  legal: "法定教育",
  health: "労働衛生教育",
};

export function CourseConclusion({
  kind,
  duration,
  basis,
  summary,
  sampleHref = "#course-sample",
}: {
  /** 教育区分（ページ既載のバッジと一致させる） */
  kind: CourseKind;
  /** 所要時間の表示文言（例「約6時間」「12時間以上」） */
  duration: string;
  /** 根拠の種別チップ（例「省令ベース」「通達ベース」）。無いページは省略 */
  basis?: string;
  /** 1行の補足（根拠条文＋対象者。ページ既載の文から要約・新規主張は足さない） */
  summary: string;
  /** サンプル資料セクションへのアンカー */
  sampleHref?: string;
}) {
  return (
    <ConclusionCard
      tone="info"
      icon={GraduationCap}
      title={KIND_LABEL[kind]}
      description={summary}
      action={{ href: sampleHref, label: "サンプル資料を見る" }}
      className="mb-6"
    >
      <StatusBadge tone="neutral" icon={Clock}>
        {duration}
      </StatusBadge>
      {basis && (
        <StatusBadge tone="neutral" icon={Scale}>
          {basis}
        </StatusBadge>
      )}
    </ConclusionCard>
  );
}
