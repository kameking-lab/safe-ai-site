import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";
import { ogImageUrl } from "@/lib/og-url";

const TITLE = "外国人労働者 × 労働安全衛生";
const DESCRIPTION =
  "技能実習・特定技能・留学生アルバイトに共通する安全衛生課題。母語（中・越・ポ・タガログ）での相談窓口、多言語KY様式、失踪・メンタル不調時の対応フローを公的資源と接続して整理します。";

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

export default function DiversityForeignWorkersPage() {
  return (
    <ScaffoldPage
      backLabel="多様性と安全に戻る"
      backHref="/diversity"
      canonicalPath="/diversity/foreign-workers"
      eyebrow="多様性 / 外国人労働者"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "在留資格別の労安衛適用範囲（技能実習・特定技能・留学生・永住）",
        "多言語KY雛形（中国語・ベトナム語・英語・ポルトガル語・タガログ語）への誘導",
        "やさしい日本語モード（1007語辞書・置換辞書 220語）と母語併記の使い分け",
        "失踪前兆のサイン（勤怠乱れ・連絡途絶・生活変化）と事業者の対応",
        "労災発生時の申請フロー（母国帰国後でも申請可・休業補償の送金）",
      ]}
      relatedLaws={[
        {
          label: "技能実習法 / 特定技能法",
          href: "/laws",
          description: "外国人技能実習機構（OTIT）による指導監督",
        },
        {
          label: "労災保険 特別加入制度",
          href: "/laws/freelance-rosai",
          description: "一人親方等の特別加入と外国人労働者",
        },
      ]}
      resources={[
        { label: "KY用紙（やさしい日本語モード対応）", href: "/ky" },
        { label: "安全用語辞書（ふりがな・多言語表記併記）", href: "/glossary" },
        { label: "Eラーニング（雇入れ時教育の素材）", href: "/e-learning" },
        { label: "労災申請フロー（特別加入制度）", href: "/laws/freelance-rosai" },
      ]}
      officialRefs={[
        {
          label: "外国人技能実習機構（OTIT） 母国語相談",
          href: "https://www.otit.go.jp/notebook/",
          description: "中国語・ベトナム語・インドネシア語・英語等で相談可",
        },
        {
          label: "JITCO 技能実習制度 教材・冊子（多言語）",
          href: "https://www.jitco.or.jp/ja/service/material/",
        },
        {
          label: "厚労省 外国人の雇用ポータル",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/jigyounushi/page09_00002.html",
        },
        {
          label: "連合 外国人労働者相談",
          href: "https://www.jtuc-rengo.or.jp/soudan/tagengo_soudan.html",
          description: "14言語対応の無料労働相談",
        },
      ]}
    />
  );
}
