import type { Metadata } from "next";
import Link from "next/link";
import { DiaryFormDetail } from "@/components/safety-diary/diary-form-detail";

export const metadata: Metadata = {
  title: "新規日誌（詳細モード・任意8項目を含む）｜安全衛生日誌 V3",
  description:
    "業者別作業・必要資格（自動推定）・予定人数・予想災害・リスク評価・安全指示・巡視記録・翌日予定を含めた詳細記録モード。",
  alternates: { canonical: "/safety-diary/new/detail" },
};

export default function NewSafetyDiaryDetailPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">📓 新規日誌（詳細モード）</h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            必須5項目に加え、任意8項目で詳細を記録します。短時間で済ませる場合は{" "}
            <Link href="/safety-diary/new" className="font-semibold text-emerald-700 underline">
              標準モード
            </Link>{" "}
            へ。
          </p>
        </div>
        <Link href="/safety-diary" className="text-xs font-semibold text-slate-500 hover:underline">
          ← 一覧へ戻る
        </Link>
      </header>
      <DiaryFormDetail />
    </main>
  );
}
