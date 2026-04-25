import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "スポットワーク（アプリ型単発雇用）× 労災";
const DESCRIPTION =
  "タイミー・シェアフル・メルカリ ハロ等のスポットワークにおける雇用関係の判別、労災適用、危険作業の拒否権。若年労働者の保護を労安法・労基法・プラットフォーマー法の3軸で整理します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE}｜ANZEN AI`,
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
        "フォークリフト等の無資格運転を断る権利（労安法 25条・労基法 5条）",
        "短時間・無教育のまま危険作業に従事させられた場合の事業者責任",
        "若年労働者（学生・18歳未満）の就業制限（労基則第60条・労安則第13条）",
      ]}
      relatedLaws={[
        {
          label: "労働安全衛生法 第25条（労働者の退避）",
          href: "/laws",
        },
        {
          label: "労働基準法 第5条（強制労働の禁止）",
          href: "/laws",
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
