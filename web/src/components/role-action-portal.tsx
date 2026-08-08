import Link from "next/link";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";

export type RoleAction = {
  href: string;
  label: string;
  description: string;
  priority?: "primary" | "secondary";
};

type RoleActionPortalProps = {
  roleLabel: string;
  heading: string;
  introduction: string;
  actions: readonly RoleAction[];
};

export function RoleActionPortal({
  roleLabel,
  heading,
  introduction,
  actions,
}: RoleActionPortalProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 sm:p-10">
        <p className="text-xs font-bold tracking-widest text-emerald-800">
          {roleLabel}
        </p>
        <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
          {heading}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          {introduction}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/risk"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
          >
            今日の安全を確認
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-400 bg-white px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50"
          >
            サイト横断検索
          </Link>
        </div>
      </header>

      <section aria-labelledby="role-actions-title">
        <h2 id="role-actions-title" className="text-2xl font-bold text-slate-950">
          目的から始める
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          同じ機能を複製せず、条件を引き継いで正規機能へ移動します。
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <li key={`${action.href}-${action.label}`}>
              <Link
                href={action.href}
                className={`group flex h-full min-h-32 flex-col rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                  action.priority === "primary"
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-300 bg-white"
                }`}
              >
                <span className="text-base font-bold text-slate-950 group-hover:text-emerald-800">
                  {action.label}
                </span>
                <span className="mt-2 flex-1 text-sm leading-6 text-slate-700">
                  {action.description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-800">
                  開く <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="role-trust-title"
        className="rounded-2xl border border-amber-300 bg-amber-50 p-5"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 h-6 w-6 shrink-0 text-amber-800"
            aria-hidden="true"
          />
          <div>
            <h2 id="role-trust-title" className="text-lg font-bold text-amber-950">
              判断前に一次資料と現場条件を確認
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-950">
              このポータルの検索・要約・入力補助は公式情報の代替ではありません。
              出典、適用日、対象業種・人数・作業条件を公式原文で確認し、資格・法令・中止基準・緊急対応は責任者または専門家が決定してください。
              根拠を再確認できない機能は公開導線から停止しています。
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/about/quality"
                className="inline-flex min-h-11 items-center rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm font-bold text-amber-950"
              >
                情報品質と更新状態
              </Link>
              <a
                href="https://elaws.e-gov.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm font-bold text-amber-950"
              >
                e-Gov法令検索
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-300 bg-sky-50 p-5">
        <h2 className="text-lg font-bold text-sky-950">
          安全衛生業務の整理・自動化を相談
        </h2>
        <p className="mt-2 text-sm leading-6 text-sky-950">
          Excel集計、帳票、教育資料、通知手順などの対応範囲、料金、現在の受付状況を確認できます。
          相談本文や連絡先をanalyticsへ送信せず、受信設定が不完全な場合は送信を停止します。
        </p>
        <Link
          href="/services/automation#consult-form"
          className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-sky-800 px-4 py-2 text-sm font-bold text-white hover:bg-sky-900"
        >
          業務自動化を相談する
        </Link>
      </section>
    </div>
  );
}
