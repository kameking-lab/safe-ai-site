import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";

const TITLE = "フリーランス・一人親方の労災特別加入";
const DESCRIPTION =
  "業務災害・通勤災害に対する労災保険の特別加入制度。加入団体の選び方・業種別の保険料・給付範囲を整理し、全国300万のフリーランスへの情報格差を解消します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function LawsFreelanceRosaiPage() {
  return (
    <ScaffoldPage
      backLabel="法改正一覧に戻る"
      backHref="/laws"
      eyebrow="法改正 / 特別加入"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "労災保険特別加入の対象（中小事業主・一人親方・特定作業従事者・海外派遣）",
        "2024年11月施行 フリーランス新法と労災特別加入対象拡大の接続",
        "業種別の加入団体選び（建設業・運輸業・IT業・文筆業・アニメ制作）",
        "給付基礎日額の選び方（3,500円〜25,000円）と保険料・手続きの実務",
        "業務災害・通勤災害の認定事例と不認定事例の比較",
      ]}
      relatedLaws={[
        {
          label: "労災保険法 第33条〜第35条（特別加入）",
          href: "/laws",
        },
        {
          label: "特定受託事業者に係る取引の適正化等に関する法律",
          href: "/laws",
          description: "通称『フリーランス新法』2024年11月施行",
        },
        {
          label: "通達・判例",
          href: "/laws/notices-precedents",
        },
      ]}
      resources={[
        { label: "外国人労働者（実習生の労災）", href: "/diversity/foreign-workers" },
        { label: "スポットワーク × 労災", href: "/laws/gig-work" },
      ]}
      officialRefs={[
        {
          label: "厚労省 労災保険 特別加入制度",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/rousai/sinsei.html",
        },
        {
          label: "建設業労災保険組合（主要団体一覧）",
          href: "https://www.kensaibou.or.jp/",
        },
        {
          label: "公正取引委員会 フリーランス・トラブル110番",
          href: "https://freelance110.mhlw.go.jp/",
        },
      ]}
    />
  );
}
