"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  Layers,
  BarChart2,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  PlusCircle,
  Building2,
  Briefcase,
} from "lucide-react";

const LmsReportChart = dynamic(() => import("@/components/lms-report-chart"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-slate-100" />,
});

// ── モックデータ ────────────────────────────────────────────────
const MOCK_USERS = [
  { id: "u1", name: "田中 一郎", dept: "製造一課", completed: 8, total: 10, certified: true, lastAt: "2026-04-10" },
  { id: "u2", name: "佐藤 花子", dept: "品質管理", completed: 10, total: 10, certified: true, lastAt: "2026-04-15" },
  { id: "u3", name: "鈴木 次郎", dept: "建設三班", completed: 5, total: 10, certified: false, lastAt: "2026-04-08" },
  { id: "u4", name: "高橋 美幸", dept: "医療福祉", completed: 3, total: 10, certified: false, lastAt: "2026-04-01" },
  { id: "u5", name: "伊藤 健太", dept: "製造二課", completed: 10, total: 10, certified: true, lastAt: "2026-04-17" },
  { id: "u6", name: "山田 太郎", dept: "運輸管理", completed: 7, total: 10, certified: false, lastAt: "2026-04-12" },
  { id: "u7", name: "中村 里奈", dept: "品質管理", completed: 10, total: 10, certified: true, lastAt: "2026-04-16" },
  { id: "u8", name: "小林 修", dept: "建設三班", completed: 2, total: 10, certified: false, lastAt: "2026-03-28" },
];

const MOCK_GROUPS = [
  { id: "g1", name: "東京本社・製造部門", type: "拠点", members: 45 },
  { id: "g2", name: "大阪支社・建設チーム", type: "拠点", members: 28 },
  { id: "g3", name: "品質管理グループ", type: "部署", members: 12 },
  { id: "g4", name: "新入社員2026年度", type: "属性", members: 19 },
];

const COMING_SOON_BADGE = (
  <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
    2026年秋リリース予定
  </span>
);

type Tab = "progress" | "groups" | "reports";

// ── サブコンポーネント ───────────────────────────────────────────
function ProgressTab() {
  const [certIssuing, setCertIssuing] = useState<string | null>(null);

  const handleIssueCert = (userId: string) => {
    setCertIssuing(userId);
    setTimeout(() => setCertIssuing(null), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">学習進捗管理</h2>
          <p className="text-xs text-slate-500">受講者の進捗・修了証発行を一覧管理できます</p>
        </div>
        {COMING_SOON_BADGE}
      </div>

      {/* 統計サマリ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "受講者数", value: MOCK_USERS.length, icon: Users, color: "blue" },
          { label: "修了者", value: MOCK_USERS.filter((u) => u.certified).length, icon: CheckCircle2, color: "emerald" },
          { label: "受講中", value: MOCK_USERS.filter((u) => !u.certified && u.completed > 0).length, icon: Clock, color: "amber" },
          { label: "未着手", value: MOCK_USERS.filter((u) => u.completed === 0).length, icon: XCircle, color: "slate" },
        ].map((stat) => {
          const Icon = stat.icon;
          const colorMap = {
            blue: "bg-blue-50 text-blue-600",
            emerald: "bg-emerald-50 text-emerald-600",
            amber: "bg-amber-50 text-amber-600",
            slate: "bg-slate-100 text-slate-500",
          } as const;
          return (
            <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className={`inline-flex rounded-lg p-2 ${colorMap[stat.color as keyof typeof colorMap]}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-1.5 text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ユーザーリスト */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">氏名</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">部署</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">進捗</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">最終受講</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">修了証</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_USERS.map((user) => {
              const pct = Math.round((user.completed / user.total) * 100);
              return (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-900">{user.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{user.dept}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-blue-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600">
                        {user.completed}/{user.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{user.lastAt}</td>
                  <td className="px-3 py-2.5">
                    {user.certified ? (
                      <button
                        type="button"
                        onClick={() => handleIssueCert(user.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={certIssuing === user.id}
                      >
                        <Award className="h-3 w-3" />
                        {certIssuing === user.id ? "発行中..." : "修了証発行"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">未修了</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-center text-[11px] text-slate-400">※ モックデータ表示中。実データはリリース後に連携されます。</p>
    </div>
  );
}

function GroupsTab() {
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("拠点");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setGroupName("");
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">グループ管理</h2>
          <p className="text-xs text-slate-500">拠点・部署別にグループを作成して、研修コースを割り当てられます</p>
        </div>
        {COMING_SOON_BADGE}
      </div>

      {/* グループ一覧 */}
      <div className="space-y-2">
        {MOCK_GROUPS.map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              {g.type === "拠点" ? (
                <Building2 className="h-5 w-5 text-blue-400" />
              ) : g.type === "部署" ? (
                <Briefcase className="h-5 w-5 text-violet-400" />
              ) : (
                <Users className="h-5 w-5 text-emerald-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                <p className="text-xs text-slate-500">
                  {g.type} · {g.members}名
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              編集
            </button>
          </div>
        ))}
      </div>

      {/* 新規グループ作成フォーム */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <PlusCircle className="h-4 w-4 text-emerald-500" />
          新規グループを作成
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="group-name">
              グループ名
            </label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="例: 東京本社・製造部門"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600" htmlFor="group-type">
              種別
            </label>
            <select
              id="group-type"
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option>拠点</option>
              <option>部署</option>
              <option>属性</option>
              <option>外部協力会社</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={submitted}
          >
            {submitted ? "作成しました！（モック）" : "グループを作成する"}
          </button>
        </form>
      </div>
      <p className="text-center text-[11px] text-slate-400">※ モックデータ表示中。実データはリリース後に連携されます。</p>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">レポート</h2>
          <p className="text-xs text-slate-500">業種別・属性別の受講完了率をグラフで確認できます</p>
        </div>
        {COMING_SOON_BADGE}
      </div>
      <LmsReportChart />
      <p className="text-center text-[11px] text-slate-400">※ モックデータ表示中。実データはリリース後に連携されます。</p>
    </div>
  );
}

// ── メインコンポーネント ─────────────────────────────────────────
export function LmsPanel() {
  const [tab, setTab] = useState<Tab>("progress");

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "progress", label: "学習進捗管理", icon: Users },
    { id: "groups", label: "グループ管理", icon: Layers },
    { id: "reports", label: "レポート", icon: BarChart2 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">LMS</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
          多拠点 学習管理システム
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          複数拠点・部署の安全教育を一元管理。受講状況・修了証・グループ研修を効率化します。
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          🛠 この機能は<strong>骨組み公開中</strong>です。
          モック画面でUIとフローをプレビューできます。本番リリースは<strong>2026年秋</strong>を予定。
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors sm:text-sm ${
              tab === id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.replace("管理", "").replace("学習進捗", "進捗")}</span>
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {tab === "progress" && <ProgressTab />}
      {tab === "groups" && <GroupsTab />}
      {tab === "reports" && <ReportsTab />}
    </div>
  );
}
