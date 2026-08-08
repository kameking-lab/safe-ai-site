import Link from "next/link";
import { ClipboardCheck, ShieldAlert } from "lucide-react";

type AlertKind = "fatal-accident" | "weather" | "law-revision";

const CHECKS: Record<AlertKind, string[]> = {
  "fatal-accident": [
    "元記事ではなく、公開主体・発生日・業種・作業条件が分かる一次資料を開く",
    "自現場の作業、設備、人数、変更点と一致する部分だけを抽出する",
    "KYへ転記する前に職長または安全衛生担当者が内容を確認する",
  ],
  weather: [
    "対象地域と絶対日時を確認し、気象庁の警報・注意報を開く",
    "取得時刻、情報が古い表示、予報と実測・推定の区分を確認する",
    "中止基準、退避場所、連絡方法を現場責任者が決定する",
  ],
  "law-revision": [
    "e-Gov等の一次資料で文書番号、公布日、施行日を確認する",
    "業種、人数、作業、経過措置など自社への適用条件を確認する",
    "社内手順へ反映する前に安全衛生担当者または専門家が確認する",
  ],
};

const LABELS: Record<AlertKind, string> = {
  "fatal-accident": "事故情報",
  weather: "気象情報",
  "law-revision": "法改正情報",
};

export function HomeSafetyAlertGenerator(
  props: {
    kind: AlertKind;
    title: string;
    context?: string;
    accent: "rose" | "amber" | "emerald";
    compact?: boolean;
  },
) {
  const { kind, accent, compact = false } = props;
  const accentClasses: Record<typeof accent, string> = {
    rose: "border-rose-300 text-rose-900",
    amber: "border-amber-300 text-amber-950",
    emerald: "border-emerald-300 text-emerald-950",
  };

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <details className={`rounded-lg border bg-white ${accentClasses[accent]}`}>
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-bold">
          <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          {LABELS[kind]}を朝礼で扱う前の確認手順
        </summary>
        <div className="border-t border-current/20 px-3 py-3">
          <p className="flex items-start gap-2 text-xs font-semibold leading-5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            未検証の安全指示を防ぐため、朝礼文のAI自動生成は停止しています。
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5">
            {CHECKS[kind].map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/risk"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50"
            >
              今日の安全を確認
            </Link>
            <Link
              href="/ky"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50"
            >
              KYを開始
            </Link>
          </div>
        </div>
      </details>
    </div>
  );
}
