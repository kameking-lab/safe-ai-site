import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";

const TITLE = "非正規雇用労働者の安全衛生｜派遣・パート・アルバイト";
const DESCRIPTION =
  "派遣労働者・パートタイム・有期雇用者の安全衛生管理。同一労働同一賃金（保護具支給等）、雇入れ時の安全衛生教育義務、派遣元・派遣先の責任分担を実務目線で解説します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function DiversityNonRegularPage() {
  return (
    <ScaffoldPage
      backLabel="多様性と安全に戻る"
      backHref="/diversity"
      eyebrow="多様性 / 非正規雇用"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "雇入れ時の安全衛生教育（労安衛法第59条）：パート・有期・派遣を問わず義務。未実施は法令違反",
        "派遣元・派遣先の責任分担：作業手順・保護具は派遣先、健診・特別教育は原則として派遣元",
        "同一労働同一賃金と安全配慮：保護具支給・特殊健診・健康管理費用でも均等待遇原則が適用",
        "有期雇用労働者の特性：短期雇用による危険作業への不慣れリスク→OJT・安全観察の強化",
        "雇用形態によらない安全衛生委員会への参画：非正規者の意見反映とゼロ災ベースライン管理",
        "特定業務（高所・クレーン・溶接等）従事時の特別教育・技能講習の確認と記録保存",
      ]}
      relatedLaws={[
        {
          label: "労安衛法 第59条（雇入れ時教育・作業変更時教育）",
          href: "/laws",
          description: "雇用形態を問わず全労働者への安全衛生教育義務",
        },
        {
          label: "労働者派遣法（派遣元・派遣先の安全衛生責任）",
          href: "/laws",
          description: "派遣元は特別教育、派遣先は作業環境・保護具提供が原則",
        },
        {
          label: "パートタイム・有期雇用労働法（均等待遇）",
          href: "/laws",
          description: "正規・非正規の不合理な待遇差禁止と安全配慮への影響",
        },
      ]}
      resources={[
        { label: "多様性と安全 トップ", href: "/diversity" },
        { label: "外国人労働者・技能実習", href: "/diversity/foreign-workers" },
        { label: "事故データベース", href: "/accidents" },
      ]}
      officialRefs={[
        {
          label: "派遣労働者に係る安全衛生管理の手引き（厚生労働省）",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/haken/index.html",
        },
        {
          label: "パートタイム・有期雇用労働法の解説（厚生労働省）",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000046152.html",
        },
      ]}
    />
  );
}
