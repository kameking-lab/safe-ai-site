import type { Metadata } from "next";
import { Bell, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "通知・配信設定｜ANZEN AI",
  description: "気象警報・法改正・事故情報の通知とメール配信設定（準備中）。",
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
    <div className="px-4 py-6 sm:py-8">
      <PageHeader
        title="通知・配信設定"
        description="気象警報・法改正・事故情報の通知とメール配信の設定"
        icon={Bell}
        iconColor="blue"
      />

      {/* Coming soon バナー */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-900">この機能は現在準備中です</p>
            <p className="mt-1 text-xs text-amber-800 leading-5">
              通知・配信機能は開発中です。サービスが開始し次第、このページで設定できるようになります。
              下記のロードマップで予定している機能をご確認ください。
            </p>
          </div>
        </div>
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
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
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
