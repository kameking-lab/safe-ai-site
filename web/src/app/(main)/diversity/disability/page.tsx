import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";

const TITLE = "障害者雇用 × 労働安全衛生";
const DESCRIPTION =
  "改正障害者雇用促進法（2024年4月）の合理的配慮義務と労安衛法の接続。発達特性・視覚過敏・聴覚過敏など個別ニーズに応じた配慮事例、ジョブコーチ制度、特例子会社の運用論点を整理します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function DiversityDisabilityPage() {
  return (
    <ScaffoldPage
      backLabel="多様性と安全に戻る"
      backHref="/diversity"
      eyebrow="多様性 / 障害者雇用"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "合理的配慮の法的枠組み（改正障害者雇用促進法 第36条の2〜4）と労安衛法の接続",
        "障害特性別の配慮事例（発達障害・視覚障害・聴覚障害・精神障害・身体障害）10件",
        "ジョブコーチ制度（職場適応援助者）— 訪問型・企業在籍型・訪問型の3区分",
        "特例子会社の設立要件と本社との安全衛生委員会の関係",
        "通勤災害の認定における配慮事項（医療通院・送迎ルート）",
      ]}
      relatedLaws={[
        {
          label: "改正障害者雇用促進法 合理的配慮指針",
          href: "/laws",
          description: "事業主の合理的配慮提供義務と過重負担の限界",
        },
        {
          label: "労安衛法 第22条（作業方法の配慮）",
          href: "/laws",
          description: "身体能力・心身の状況に応じた作業方法の配慮義務",
        },
        {
          label: "通達・判例（SOGI含む）",
          href: "/laws/notices-precedents",
        },
      ]}
      resources={[
        { label: "多様性と安全 トップ", href: "/diversity" },
        { label: "メンタル・カスハラ", href: "/mental-health" },
        { label: "SOGI ハラスメント", href: "/diversity/sogi" },
      ]}
      officialRefs={[
        {
          label: "厚労省 障害者の雇用の促進等に関する法律",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/shougaishakoyou/index.html",
          description: "事業主指針・助成金・制度総合ポータル",
        },
        {
          label: "独立行政法人 高齢・障害・求職者雇用支援機構（JEED）",
          href: "https://www.jeed.go.jp/",
          description: "ジョブコーチ派遣・障害者雇用管理サポーター",
        },
      ]}
      cta={{
        label: "問い合わせる",
        href: "/contact",
        description: "貴社の現場に合わせた配慮事例をまとめてご紹介します。",
      }}
    />
  );
}
