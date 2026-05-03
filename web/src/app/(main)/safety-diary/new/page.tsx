import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { DiaryFormRequired } from "@/components/safety-diary/diary-form-required";

export const metadata: Metadata = {
  title: "新規日誌作成（必須5項目・3〜5分）｜安全衛生日誌 V3",
  description: "日付・天候・現場名・作業内容・KY結果・ヒヤリハットの必須5項目を3〜5分で入力します。",
  alternates: { canonical: "/safety-diary/new" },
};

export default function NewSafetyDiaryPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">📓 新規日誌作成</h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            必須5項目（3〜5分）。詳細を増やしたい場合は <Link href="/safety-diary/new/detail" className="font-semibold text-emerald-700 underline">詳細モード</Link> へ。
          </p>
        </div>
        <Link
          href="/safety-diary"
          className="text-xs font-semibold text-slate-500 hover:underline"
        >
          ← 一覧へ戻る
        </Link>
      </header>
      <Suspense fallback={<div className="text-sm text-slate-500">読み込み中…</div>}>
        <DiaryFormRequired />
      </Suspense>
    </main>
  );
}
