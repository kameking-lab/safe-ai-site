import type { Metadata } from "next";
import { Building2, Users, Shield, FileText, PieChart, Award } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ogImageUrl } from "@/lib/og-url";

const _title = "組織管理ダッシュボード｜デモ版";
const _desc =
  "ANZEN AI 法人向けの組織管理ダッシュボード（モック）。拠点・部署・受講進捗・安全統括の一元管理。正式リリース前のデモ版です。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl(_title, _desc)],
  },
};

const SITES = [
  { id: "s1", name: "東京本社（製造）", address: "東京都千代田区", employees: 120, sv: "田中 一郎" },
  { id: "s2", name: "大阪支社（建設）", address: "大阪府大阪市", employees: 78, sv: "鈴木 次郎" },
  { id: "s3", name: "名古屋工場（物流）", address: "愛知県名古屋市", employees: 45, sv: "佐藤 花子" },
  { id: "s4", name: "福岡現場（介護）", address: "福岡県福岡市", employees: 30, sv: "高橋 美幸" },
];

const DEPARTMENTS = [
  { id: "d1", name: "製造一課", head: "田中 一郎", members: 45, trainingRate: 92 },
  { id: "d2", name: "品質管理", head: "佐藤 花子", members: 12, trainingRate: 100 },
  { id: "d3", name: "建設三班", head: "鈴木 次郎", members: 28, trainingRate: 64 },
  { id: "d4", name: "医療福祉", head: "高橋 美幸", members: 30, trainingRate: 78 },
];

const KPI = [
  { label: "登録事業所", value: "4拠点", icon: Building2, color: "text-blue-600 bg-blue-50" },
  { label: "登録社員数", value: "273名", icon: Users, color: "text-emerald-600 bg-emerald-50" },
  { label: "教育修了率", value: "83.5%", icon: Award, color: "text-amber-600 bg-amber-50" },
  { label: "直近事故件数", value: "0件/30日", icon: Shield, color: "text-rose-600 bg-rose-50" },
];

export default function OrganizationPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <PageHeader
        title="組織管理ダッシュボード"
        description="拠点・部署・受講進捗・安全統括を一元管理するモック画面です"
        icon={Building2}
        iconColor="blue"
        badge="デモ版"
      />

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        <p className="font-semibold">デモ版 / モックデータ表示中</p>
        <p className="mt-1">
          本画面はEnterpriseプラン向け管理ダッシュボードのUIプレビューです。実データ連携・SSO・権限管理は正式リリース（2026年秋予定）で提供します。
          Enterpriseの詳細は <a href="/pricing" className="underline hover:text-amber-900">/pricing</a> を参照してください。
        </p>
      </div>

      {/* KPI cards */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-900">組織KPI（30日）</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KPI.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className={`inline-flex rounded-lg p-2 ${k.color}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">{k.value}</p>
                <p className="text-xs text-slate-500">{k.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sites table */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">拠点一覧</h2>
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            デモ版
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">拠点名</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">所在地</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500">社員数</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">安全統括者</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SITES.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-900">{s.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{s.address}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-700">{s.employees}</td>
                  <td className="px-3 py-2.5 text-slate-600">{s.sv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Departments */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">部署別 教育修了率</h2>
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            デモ版
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEPARTMENTS.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500">責任者: {d.head} / {d.members}名</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    d.trainingRate >= 90
                      ? "bg-emerald-100 text-emerald-800"
                      : d.trainingRate >= 70
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                  }`}
                >
                  修了率 {d.trainingRate}%
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    d.trainingRate >= 90
                      ? "bg-emerald-500"
                      : d.trainingRate >= 70
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${d.trainingRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Admin quick actions (stubs) */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-slate-900">管理メニュー（モック）</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: FileText, label: "安全衛生日誌の全社集計", desc: "部署ごとの日誌提出状況を確認" },
            { icon: PieChart, label: "事故統計レポート（四半期）", desc: "業種別・種類別に傾向を把握" },
            { icon: Award, label: "特別教育 修了証一括発行", desc: "LMSと連携。Standardプラン以上" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="inline-flex rounded-lg bg-slate-100 p-2 text-slate-600">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500 leading-5">{item.desc}</p>
                <button
                  type="button"
                  disabled
                  className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-400"
                >
                  デモ版（正式リリース後に有効化）
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        ※ 本画面は構成例を示すモック表示です。実データは Enterpriseプラン契約後に連携されます。
      </p>
    </main>
  );
}
