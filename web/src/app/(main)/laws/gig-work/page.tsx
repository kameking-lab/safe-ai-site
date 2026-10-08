import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "スポットワーク（アプリ型単発雇用）× 労災";
const DESCRIPTION =
  "タイミー・シェアフル・メルカリ ハロ等のスポットワークにおける雇用関係の判別、労災適用、危険作業時の事業者の義務と満18歳未満の就業制限を確認するための論点を示します。";

export const metadata: Metadata = {
  alternates: { canonical: "/laws/gig-work" },
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE}`,
    description: DESCRIPTION,
    images: [{ url: ogImageUrl(TITLE, DESCRIPTION), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(TITLE, DESCRIPTION)],
  },
};

export default function LawsGigWorkPage() {
  return (
    <ScaffoldPage
      backLabel="法改正一覧に戻る"
      backHref="/laws"
      canonicalPath="/laws/gig-work"
      eyebrow="法改正 / スポットワーク"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "雇用 / 請負 / 業務委託 — アプリ契約書をどう読むか（労基法 9条の労働者性判断）",
        "スポットワーカーの労災適用：業務上災害の申請先（当日雇用主 or プラットフォーム）",
        "資格要件・無資格者の就業禁止（安衛法61条）と教育義務（59条）は、対象業務ごとに確認する",
        "労働災害発生の急迫した危険時は、事業者が作業を中止し、退避等の必要措置を講ずる（安衛法25条）",
        "満18歳未満の危険有害業務制限（労基法62条・年少者労働基準規則7条・8条）。学生でも年齢を個別に確認する",
      ]}
      relatedLaws={[
        {
          label: "労働安全衛生法 第25条（事業者による作業中止・退避等）",
          href: "https://laws.e-gov.go.jp/law/347AC0000000057/20261001_507AC0000000033",
          external: true,
        },
        {
          label: "労働基準法 第62条（満18歳未満の危険有害業務制限）",
          href: "https://laws.e-gov.go.jp/law/322AC0000000049/20260717_508AC0000000060",
          external: true,
        },
        {
          label: "フリーランス新法 / 特定受託事業者法",
          href: "/laws/freelance-rosai",
        },
      ]}
      resources={[
        { label: "フリーランス・一人親方の労災", href: "/laws/freelance-rosai" },
        { label: "KY 用紙（若手向けプリセット）", href: "/ky" },
        { label: "安全用語辞書", href: "/glossary" },
      ]}
      officialRefs={[
        { label: "年少者労働基準規則 第7条・第8条", href: "https://laws.e-gov.go.jp/law/329M50002000013/20210401_502M60000100203" },
        {
          label: "厚労省 労働者性判断基準（昭60年基発150号）",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/index.html",
        },
        {
          label: "公正取引委員会 フリーランス・トラブル110番",
          href: "https://freelance110.mhlw.go.jp/",
        },
      ]}
    />
  );
}
