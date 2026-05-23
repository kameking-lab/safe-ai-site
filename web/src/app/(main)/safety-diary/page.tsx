import { Suspense } from "react";
import type { Metadata } from "next";
import { DiaryPaperPageContent } from "@/components/safety-diary/diary-paper-page-content";
import { PageSkeleton } from "@/components/skeleton";
import { ogImageUrl } from "@/lib/og-url";
import { PageJsonLd } from "@/components/page-json-ld";

const _title = "安全衛生日誌 ｜ 完成形の用紙に直接書き込む (用紙ファースト型UI)";
const _desc =
  "安全衛生日誌をA4用紙そのままの画面で作成。必須5項目 (日付・天候・現場名・作業内容・KY結果・ヒヤリハット) を3〜5分で入力し、印刷/PDF出力に対応。昨日の日誌から流用も可能。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/safety-diary" },
  openGraph: {
    title: `${_title}`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

export default function SafetyDiaryPage() {
  return (
    <>
      <PageJsonLd
        name="安全衛生日誌 (用紙ファースト)"
        description="完成形のA4用紙に直接書き込んで保存できる安全衛生日誌。"
        path="/safety-diary"
      />
      <Suspense fallback={<PageSkeleton label="日誌用紙を読み込み中" />}>
        <DiaryPaperPageContent />
      </Suspense>
    </>
  );
}
