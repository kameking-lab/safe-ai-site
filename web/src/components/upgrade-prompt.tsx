"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

interface Props {
  featureName: string;
  limit: number;
  period: "day" | "session";
  onReset?: () => void;
}

export function UpgradePrompt({ featureName, limit, period, onReset }: Props) {
  const periodLabel = period === "day" ? "1日" : "1セッション";

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
        <Lock className="h-7 w-7 text-amber-600" />
      </div>
      <p className="text-lg font-bold text-amber-900 mb-2">
        無料プランの上限に達しました
      </p>
      <p className="text-sm text-amber-700 leading-6 mb-2">
        {featureName}は無料プランで{periodLabel}
        <span className="font-semibold">{limit}回</span>まで利用できます。
      </p>
      <p className="text-sm text-amber-700 leading-6 mb-6">
        プレミアムプランにアップグレードすると無制限でご利用いただけます。
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-600 active:scale-[0.98] transition"
        >
          プランを確認する →
        </Link>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            リセットして続ける（デモ）
          </button>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        ※ 無料プランでも基本機能はご利用いただけます。
      </p>
    </div>
  );
}
