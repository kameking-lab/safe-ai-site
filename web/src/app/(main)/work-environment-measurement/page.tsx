import type { Metadata } from "next";
import Link from "next/link";
import { Gauge, ClipboardList, Search, BookOpen, AlertTriangle } from "lucide-react";
import { PageJsonLd } from "@/components/page-json-ld";
import { JsonLd } from "@/components/json-ld";
import { ogImageUrl } from "@/lib/og-url";
import { MEASUREMENT_CATEGORIES, FREQUENCY_LABEL, METHOD_LABEL } from "@/data/measurement-rules";
import { Mascot } from "@/components/mascot";

const _title = "作業環境測定 管理区分判定ツール";
const _desc =
  "安衛令第21条に基づく10種類の測定対象作業場を自動判定。A測定・B測定値から管理区分（第1〜第3）を算出し、区分別の改善措置を提案。作業環境測定法・作業環境測定基準告示準拠。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/work-environment-measurement" },
  openGraph: {
    title: _title,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogImageUrl(_title, _desc)] },
};

export default function WorkEnvironmentMeasurementPage() {
  return (
    <>
      <PageJsonLd
        name="作業環境測定 管理区分判定ツール"
        description="作業環境測定法・安衛令第21条に基づく10種類の測定対象判定と管理区分判定を支援するツール。"
        path="/work-environment-measurement"
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "作業環境測定 管理区分判定ツール",
          description: _desc,
          url: "https://www.anzen-ai-portal.jp/work-environment-measurement",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: 0, priceCurrency: "JPY" },
          publisher: {
            "@type": "Organization",
            name: "安全AIポータル",
            url: "https://www.anzen-ai-portal.jp",
          },
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Page header */}
        <header className="mb-8">
          <div className="flex items-start gap-4">
            <Mascot variant="measure-meter" size="lg" alt="" className="order-last ml-auto hidden shrink-0 sm:block" />
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 shadow-sm">
              <Gauge className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  作業環境測定 管理区分判定
                </h1>
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                  安衛令第21条準拠
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">
                測定対象作業場の自動判定・A測定/B測定による管理区分（第1〜第3）算出・改善措置提案
              </p>
            </div>
          </div>
        </header>

        {/* Tool cards */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">ツールを選ぶ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/work-environment-measurement/target-finder"
              className="group flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-5 transition hover:border-teal-400 hover:bg-teal-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600">
                  <Search className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-teal-900">測定対象作業場チェッカー</p>
                  <p className="text-xs text-teal-700">業種・工程・物質から判定</p>
                </div>
              </div>
              <p className="text-sm text-slate-700">
                業種・作業工程・取扱物質を入力すると、安衛令第21条の10種類のうち自社が該当する
                測定対象作業場を一覧表示し、測定方法・頻度・担当資格を確認できます。
              </p>
              <span className="self-start rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-teal-700">
                チェックを開始 →
              </span>
            </Link>

            <Link
              href="/work-environment-measurement/management-class-judge"
              className="group flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5 transition hover:border-blue-400 hover:bg-blue-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <ClipboardList className="h-5 w-5 text-white" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">管理区分 判定ツール</p>
                  <p className="text-xs text-blue-700">A測定・B測定値を入力</p>
                </div>
              </div>
              <p className="text-sm text-slate-700">
                測定値と管理濃度を入力すると、作業環境測定基準告示に基づく管理区分（第1〜第3）を
                即座に判定。区分別の義務的改善措置もあわせて確認できます。
              </p>
              <span className="self-start rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-blue-700">
                判定を開始 →
              </span>
            </Link>
          </div>
        </section>

        {/* Legal basis note */}
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div className="text-sm text-amber-900">
              <p className="font-semibold">ご利用上の注意</p>
              <p className="mt-1">
                本ツールは意思決定支援を目的としており、法令上の最終判断は
                <strong>作業環境測定機関または労働衛生コンサルタント</strong>
                による確認が必要です。管理濃度の数値は厚労省の最新告示を必ずご確認ください。
              </p>
              <p className="mt-1 text-xs text-amber-800">
                出典: 作業環境測定基準（昭和51年労働省告示第46号）/ 安衛令第21条 /
                JISHA「作業環境測定ガイドブック」
              </p>
            </div>
          </div>
        </div>

        {/* 10 categories overview */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-500" aria-hidden />
            <h2 className="text-lg font-semibold text-slate-800">
              安衛令第21条 — 作業環境測定対象10種類
            </h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">号</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">測定対象</th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-slate-700 sm:table-cell">
                    測定方法
                  </th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-slate-700 md:table-cell">
                    測定頻度
                  </th>
                  <th className="hidden px-4 py-3 text-left font-semibold text-slate-700 lg:table-cell">
                    管理区分
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MEASUREMENT_CATEGORIES.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">
                      第{idx + 1}号
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{cat.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{cat.legalBasis}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                      {METHOD_LABEL[cat.method] ?? cat.method}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {FREQUENCY_LABEL[cat.frequency] ?? cat.frequency}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {cat.hasManagementClass ? (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                          あり（第1〜3）
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          なし
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-right text-xs text-slate-500">
            ※ 出典: 労働安全衛生法第65条 / 安衛令第21条 / 各特化則・有機則・鉛則等
          </p>
        </section>
      </div>
    </>
  );
}
