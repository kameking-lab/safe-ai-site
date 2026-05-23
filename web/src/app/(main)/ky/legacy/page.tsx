import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { KyPageContent } from "@/components/ky-page-content";
import { PageSkeleton } from "@/components/skeleton";

const _title = "KY用紙 詳細モード｜従来の現地KY記録表 (4ラウンド法 / 墜落防止点検)";
const _desc =
  "詳細な現地KY記録表 (横長様式)・墜落防止点検・終了確認まで対応する従来の詳細モード。新しい用紙ファースト型UIで足りない場合はこちら。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/ky/legacy" },
  robots: { index: false, follow: true },
};

export default function KyLegacyPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          詳細モード (現地KY記録表・墜落防止点検) を表示しています。シンプルな用紙ファースト型UIは{" "}
          <Link href="/ky" className="font-semibold text-emerald-700 underline">
            /ky
          </Link>{" "}
          へ。
        </p>
      </div>
      <Suspense fallback={<PageSkeleton label="KY詳細フォームを読み込み中" />}>
        <KyPageContent />
      </Suspense>
    </>
  );
}
