import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";

const TITLE = "高齢労働者の安全衛生｜エイジフレンドリーガイドライン";
const DESCRIPTION =
  "高齢労働者（60歳以上）の転倒・腰痛・熱中症リスクへの対応。厚労省「エイジフレンドリーガイドライン」に基づく安全配慮義務・健康管理・職場環境改善の実務ポイントを解説します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function DiversityElderlyPage() {
  return (
    <ScaffoldPage
      backLabel="多様性と安全に戻る"
      backHref="/diversity"
      eyebrow="多様性 / 高齢労働者"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "エイジフレンドリーガイドライン（令和2年厚労省）— 高齢者の就労継続支援と安全確保の基本方針",
        "転倒災害対策：床面整備・段差解消・照度確保・滑り止め靴の選定（転倒は60歳以上の労働災害の主要原因）",
        "腰痛予防：重量物制限・作業姿勢改善・補助機器（アシストスーツ）導入のポイント",
        "熱中症リスク管理：加齢による体温調節機能低下への対応と休憩・水分補給の徹底",
        "健康管理：定期健康診断に加えた生活習慣病フォローと就業可否判断の手順",
        "体力低下・視力・聴力に配慮した作業設計と機械設備のリスクアセスメント",
      ]}
      relatedLaws={[
        {
          label: "労安衛法 第22条・第66条（健康診断・健康管理）",
          href: "/laws",
          description: "事業者の健康管理義務と特定業務従事者への健診強化",
        },
        {
          label: "労働施策総合推進法（70歳就業確保措置）",
          href: "/laws",
          description: "65〜70歳の就業機会確保に関する努力義務（令和3年〜）",
        },
        {
          label: "高年齢者雇用安定法",
          href: "/laws",
          description: "65歳までの雇用確保義務と高齢者雇用推進の枠組み",
        },
      ]}
      resources={[
        { label: "多様性と安全 トップ", href: "/diversity" },
        { label: "メンタル・カスハラ", href: "/mental-health" },
        { label: "事故データベース", href: "/accidents" },
      ]}
      officialRefs={[
        {
          label: "高年齢労働者の安全と健康確保のためのガイドライン（エイジフレンドリーガイドライン）",
          href: "https://www.mhlw.go.jp/stf/newpage_10987.html",
        },
        {
          label: "職場における腰痛予防対策指針（厚生労働省）",
          href: "https://www.mhlw.go.jp/stf/houdou/2r98520000034et4.html",
        },
      ]}
    />
  );
}
