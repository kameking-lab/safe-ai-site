import type { Metadata } from "next";
import { MeetingPaperView } from "@/components/meeting/meeting-paper-view";
import { PageJsonLd } from "@/components/page-json-ld";
import { ogImageUrl } from "@/lib/og-url";

const _title = "安全工程打合せ書・安全衛生指示書 ｜ 元請が前日5分で作成";
const _desc =
  "北海道労働局公式版ベースの「安全工程打合せ書及び安全衛生指示書」を用紙ファーストで作成。各社の作業・使用機械・必要資格・予想災害・リスク評価・指示事項を1枚に。点検項目8カテゴリ・使用機械自動集計・印刷対応。無料・登録不要。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/safety-diary" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl(_title, _desc)] },
};

export default function SafetyDiaryPage() {
  return (
    <>
      <PageJsonLd
        name="安全工程打合せ書・安全衛生指示書"
        description="北海道労働局公式版ベースの打合せ書。各社マトリクス・点検項目8カテゴリ・使用機械自動集計・印刷対応。"
        path="/safety-diary"
      />
      <MeetingPaperView />
    </>
  );
}
