import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";

const TITLE = "BCP 策定義務化 × 労働安全衛生";
const DESCRIPTION =
  "2024年4月から介護施設等で義務化された BCP（事業継続計画）の策定。労安衛法の安全配慮義務・避難訓練・危険物管理と BCP の接続、中小事業者向けのテンプレート運用論点を整理します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function LawsBcpPage() {
  return (
    <ScaffoldPage
      backLabel="法改正一覧に戻る"
      backHref="/laws"
      eyebrow="法改正 / BCP義務化"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "介護報酬改定2024（3年経過措置終了）による BCP 策定義務化の範囲",
        "自然災害 BCP と感染症 BCP の二本立て（厚労省ガイドライン）",
        "労安衛法との接続：避難訓練（消防法）・危険物管理・停電時の酸欠防止",
        "中小施設向け A4 1 枚スタータースキーム（業務影響分析・重要業務の特定）",
        "協力医療機関連携・地域 BCP ネットワーク（社協・災害派遣チーム）",
      ]}
      relatedLaws={[
        {
          label: "介護報酬改定 2024（厚労省告示）",
          href: "/laws",
          description: "BCP策定・訓練の義務化経過措置",
        },
        {
          label: "労安衛法 第23条（事業者の責務）",
          href: "/laws",
          description: "通常時・非常時ともに安全配慮義務",
        },
        {
          label: "通達・判例",
          href: "/laws/notices-precedents",
        },
      ]}
      resources={[
        { label: "事故データベース（災害起因）", href: "/accidents" },
        { label: "KY 用紙（災害想定プリセット）", href: "/ky" },
      ]}
      officialRefs={[
        {
          label: "厚労省 介護施設・事業所における BCP",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/bcp.html",
          description: "ガイドライン・ひな形・研修動画",
        },
        {
          label: "中小企業庁 中小企業 BCP 策定運用指針",
          href: "https://www.chusho.meti.go.jp/bcp/",
        },
      ]}
    />
  );
}
