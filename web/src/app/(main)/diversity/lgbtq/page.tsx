import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "LGBTQ・SOGI配慮と職場の安全衛生";
const DESCRIPTION =
  "LGBTQ当事者（トランスジェンダー・ノンバイナリー含む）が安全に働くための職場配慮。トイレ・更衣室のアクセス、SOGIハラスメント防止、社内制度（パートナーシップ等）と労働安全衛生の接続を整理します。";

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

export default function DiversityLgbtqPage() {
  return (
    <ScaffoldPage
      backLabel="多様性と安全に戻る"
      backHref="/diversity"
      canonicalPath="/diversity/lgbtq"
      eyebrow="多様性 / LGBTQ・SOGI"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "SOGIハラスメント防止：性的指向・性自認に関するアウティング・からかい・差別的言動はパワハラ指針の対象",
        "トイレ・更衣室アクセス：トランスジェンダー当事者への配慮事例（多目的トイレ利用・職場での通称名使用）",
        "健康管理の配慮：ホルモン療法中の薬剤管理・熱環境リスク（バインダー等着用時の体温管理）",
        "緊急時対応：氏名・性別の不一致に伴う医療同意・緊急連絡先設定への配慮",
        "社内制度：パートナーシップ制度・慶弔休暇・社宅規定の整備と労働条件の均等化",
        "相談窓口：SOGI関連相談を受けられるEAP・産業医・社内ハラスメント窓口の整備",
      ]}
      relatedLaws={[
        {
          label: "労安衛法 第19条の2（ハラスメント防止義務）",
          href: "/laws",
          description: "事業者のハラスメント防止措置義務とパワハラ指針のSOGI条項",
        },
        {
          label: "女性活躍推進法・育児・介護休業法",
          href: "/laws",
          description: "性別にかかわらず活躍できる職場環境整備の枠組み",
        },
        {
          label: "通達・判例（SOGI含む）",
          href: "/laws/notices-precedents",
          description: "SOGIハラスメントに関する行政通達・裁判例",
        },
      ]}
      resources={[
        { label: "多様性と安全 トップ", href: "/diversity" },
        { label: "SOGI配慮（詳細）", href: "/diversity/sogi" },
        { label: "メンタル・カスハラ", href: "/mental-health" },
      ]}
      officialRefs={[
        {
          label: "パワーハラスメント防止対策（厚生労働省）— SOGIハラ・アウティング含む",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/seisaku06/index.html",
        },
        {
          label: "性的マイノリティに関する相談窓口一覧（厚生労働省）",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000135090.html",
        },
      ]}
    />
  );
}
