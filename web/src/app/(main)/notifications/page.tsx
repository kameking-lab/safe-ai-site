import type { Metadata } from "next";
import { Bell, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SubscribeForm } from "./subscribe-form";
import { ogImageUrl } from "@/lib/og-url";

const _title = "安全情報 通知・メール配信設定";
const _desc =
  "気象警報・労働安全衛生法改正・労働災害情報の通知とメール配信設定。重要な安全情報を見逃さない。";

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

const ROADMAP = [
  {
    phase: "Phase 1",
    status: "開発中",
    items: [
      "気象庁の大雨・強風警報をプッシュ通知",
      "労働安全衛生法の改正公布をメール配信",
      "現場エリア別リスクアラート",
    ],
  },
  {
    phase: "Phase 2",
    status: "計画中",
    items: [
      "厚労省の重大災害発生速報を配信",
      "登録キーワードの法令改正トリガー通知",
      "LINEへの配信連携",
    ],
  },
  {
    phase: "Phase 3",
    status: "検討中",
    items: [
      "現場ごとのカスタム通知ルール設定",
      "Slack・Teams連携",
      "配信レポートのエクスポート",
    ],
  },
] as const;

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <PageHeader
        title="通知・配信設定"
        description="気象警報・法改正・事故情報の通知とメール配信の設定"
        icon={Bell}
        iconColor="blue"
      />

      {/* 気象警報メール登録フォーム */}
      <div className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-800">気象警報メール通知を登録する</h2>
        </div>
        <p className="mb-4 text-xs text-slate-600 leading-5">
          大雨・暴風・高温注意情報などの気象警報が発令された際に、現場担当者へメールでお知らせします。
          登録は無料です（プレミアムプランで地域指定通知が利用可能）。
        </p>
        <SubscribeForm />
      </div>

      {/* ロードマップ */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-slate-900 sm:text-base">今後の配信予定機能</h2>
        <div className="mt-3 space-y-4">
          {ROADMAP.map((phase) => (
            <div
              key={phase.phase}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">{phase.phase}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    phase.status === "開発中"
                      ? "bg-blue-100 text-blue-700"
                      : phase.status === "計画中"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {phase.status}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {phase.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
