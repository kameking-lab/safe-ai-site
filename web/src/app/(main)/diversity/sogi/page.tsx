import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";

const TITLE = "SOGI と職場の安全衛生";
const DESCRIPTION =
  "性的指向・性自認（SOGI）に関するハラスメント・アウティングの防止と、トランスジェンダー従業員の更衣室・トイレ運用。パワハラ防止法（2020年施行）の指針と労安衛法の安全配慮義務が交差する論点を整理します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function DiversitySogiPage() {
  return (
    <ScaffoldPage
      backLabel="多様性と安全に戻る"
      backHref="/diversity"
      eyebrow="多様性 / SOGI"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "SOGI ハラスメントの法的位置づけ（パワハラ防止法 指針・令和2年厚労告5号）",
        "アウティング（暴露）禁止と事業主の雇用管理上の措置義務",
        "トランスジェンダー従業員の更衣室・トイレ運用事例（行政・民間3社）",
        "経済産業省トイレ使用制限事件（最三小判令5.7.11）と合理的配慮",
        "相談窓口体制の整備（匿名性・秘密保持・二次被害防止）",
      ]}
      relatedLaws={[
        {
          label: "パワハラ防止法 指針（令和2年厚労告示第5号）",
          href: "/laws/notices-precedents",
          description: "SOGI ハラ・アウティングも対象と明示",
        },
        {
          label: "最三小判令5.7.11 トイレ使用制限事件",
          href: "/laws/notices-precedents",
          description: "職場SOGIに関する合理的配慮義務の最高裁判例",
        },
      ]}
      resources={[
        { label: "多様性と安全 トップ", href: "/diversity" },
        { label: "メンタル・カスハラ", href: "/mental-health" },
        { label: "障害者雇用", href: "/diversity/disability" },
      ]}
      officialRefs={[
        {
          label: "厚労省 職場におけるパワーハラスメント対策",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/seisaku06/index.html",
        },
        {
          label: "法務省 性的指向・性自認（SOGI）と人権",
          href: "https://www.moj.go.jp/JINKEN/LGBT/index.html",
        },
      ]}
    />
  );
}
