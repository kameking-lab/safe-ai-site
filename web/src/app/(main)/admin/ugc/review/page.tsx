import type { Metadata } from "next";
import { ReviewClient } from "./ReviewClient";
import { COMMUNITY_CASES_SEED } from "@/data/mock/community-cases";

export const metadata: Metadata = {
  title: "UGC審査｜管理画面",
  robots: { index: false, follow: false },
};

export default function UgcReviewPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          管理画面
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          UGC審査キュー
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          AI監査パイプラインの判定結果を確認し、公開／差戻しを決定します。
        </p>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ※ 開発用の管理画面です。サーバーシード（{COMMUNITY_CASES_SEED.length}件）と、ブラウザのlocalStorageに保存された投稿を表示します。
        </p>
      </header>

      <ReviewClient seed={COMMUNITY_CASES_SEED} />
    </main>
  );
}
