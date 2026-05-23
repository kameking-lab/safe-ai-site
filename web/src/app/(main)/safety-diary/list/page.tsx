import type { Metadata } from "next";
import Link from "next/link";
import { DiaryListClient } from "@/components/safety-diary/diary-list-client";
import { RelatedPageCards } from "@/components/related-page-cards";
import { PageJsonLd } from "@/components/page-json-ld";

const _title = "安全衛生日誌 一覧｜過去の現場日誌を月別に閲覧";
const _desc =
  "保存済み安全衛生日誌の一覧。月別フィルタ・JSONエクスポート・新規記録への導線を提供します。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/safety-diary/list" },
  robots: { index: false, follow: true },
};

export default function SafetyDiaryListPage() {
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          一覧モードを表示しています。新規記録は{" "}
          <Link href="/safety-diary" className="font-semibold text-emerald-700 underline">
            /safety-diary
          </Link>
          {" "}(用紙ファースト) へ。
        </p>
      </div>
      <PageJsonLd
        name="安全衛生日誌 一覧"
        description="保存済み日誌一覧"
        path="/safety-diary/list"
      />
      <DiaryListClient />
      <RelatedPageCards
        heading="合わせて使う"
        pages={[
          {
            href: "/ky",
            label: "KY用紙を作成",
            description: "朝礼のKY結果を用紙ファーストUIで作成。本日の日誌にそのまま転記可能。",
            color: "emerald",
            cta: "KYを書く",
          },
          {
            href: "/accidents",
            label: "類似事故事例",
            description: "日誌の作業内容に近い事故事例を逆引き、翌月のKYに反映できます。",
            color: "orange",
            cta: "事例を見る",
          },
        ]}
      />
    </>
  );
}
