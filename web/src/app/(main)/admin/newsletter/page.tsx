"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Mail, PieChart, Send, RefreshCw, AlertCircle } from "lucide-react";

interface SubscribersData {
  total: number;
  inactive: number;
  industryDistribution: Record<string, number>;
  subscribers: { email: string; industry: string; subscribedAt: string }[];
  sendHistory: { sentAt: string; subject: string; recipientCount: number }[];
}

const INDUSTRY_COLORS: Record<string, string> = {
  建設: "bg-orange-100 text-orange-700",
  製造: "bg-blue-100 text-blue-700",
  医療福祉: "bg-pink-100 text-pink-700",
  運輸: "bg-yellow-100 text-yellow-700",
  IT: "bg-purple-100 text-purple-700",
  その他: "bg-slate-100 text-slate-600",
};

export default function AdminNewsletterPage() {
  const [data, setData] = useState<SubscribersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [sendMsg, setSendMsg] = useState("");
  const [adminToken, setAdminToken] = useState("");

  const fetchData = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribers", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        setData(null);
        return;
      }
      const json = (await res.json()) as SubscribersData;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(adminToken);
  }, [fetchData, adminToken]);

  async function handleSendNow() {
    if (!confirm("今すぐ週間メルマガを配信しますか？")) return;
    setSendStatus("sending");
    setSendMsg("");
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      const json = (await res.json()) as { ok?: boolean; sent?: number; error?: string; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "配信に失敗しました。");
      setSendStatus("done");
      setSendMsg(json.message ?? `${json.sent ?? 0} 件に配信しました。`);
      void fetchData(adminToken);
    } catch (err) {
      setSendStatus("error");
      setSendMsg(err instanceof Error ? err.message : "エラーが発生しました。");
    }
  }

  const totalIndustry = data
    ? Object.values(data.industryDistribution).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Mail className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">メルマガ管理</h1>
            <p className="text-xs text-slate-500">週間安全情報 配信管理</p>
          </div>
        </div>
        <button
          onClick={() => void fetchData(adminToken)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          更新
        </button>
      </div>

      {/* トークン入力（NEWSLETTER_ADMIN_TOKEN設定時に必要） */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <label htmlFor="admin-token" className="mb-1.5 block text-xs font-semibold text-slate-600">
          管理者トークン（NEWSLETTER_ADMIN_TOKEN 未設定時は空欄でOK）
        </label>
        <input
          id="admin-token"
          type="password"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          onBlur={() => void fetchData(adminToken)}
          placeholder="管理者トークン"
          className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">読み込み中...</div>
      ) : !data ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>データを取得できませんでした。トークンを確認してください。</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI カード */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "登録者数", value: data.total, icon: Users, color: "emerald" },
              { label: "業種数", value: Object.keys(data.industryDistribution).length, icon: PieChart, color: "blue" },
              { label: "停止済み", value: data.inactive, icon: Mail, color: "slate" },
              { label: "配信回数", value: data.sendHistory.length, icon: Send, color: "purple" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* 手動配信 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-800">手動配信</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => void handleSendNow()}
                disabled={sendStatus === "sending" || data.total === 0}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {sendStatus === "sending" ? "配信中..." : `今すぐ配信 (${data.total}件)`}
              </button>
              {sendMsg && (
                <p
                  className={`text-sm ${sendStatus === "done" ? "text-emerald-600" : "text-red-600"}`}
                >
                  {sendMsg}
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              RESEND_API_KEY が未設定の場合は配信されません。
            </p>
          </div>

          {/* 業種別分布 */}
          {Object.keys(data.industryDistribution).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-slate-800">業種別分布</h2>
              <div className="space-y-2">
                {Object.entries(data.industryDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([ind, count]) => {
                    const pct = totalIndustry > 0 ? Math.round((count / totalIndustry) * 100) : 0;
                    return (
                      <div key={ind} className="flex items-center gap-3">
                        <span
                          className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${INDUSTRY_COLORS[ind] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {ind}
                        </span>
                        <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-2">
                          <div
                            className="h-2 rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-xs text-slate-500">
                          {count}人 ({pct}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 配信履歴 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-800">配信履歴</h2>
            {data.sendHistory.length === 0 ? (
              <p className="text-sm text-slate-400">配信履歴がありません（再起動でリセットされます）</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.sendHistory.map((rec) => (
                  <div key={rec.sentAt} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{rec.subject}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(rec.sentAt).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{rec.recipientCount}件</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 登録者一覧 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-bold text-slate-800">
              登録者一覧 ({data.subscribers.length}件)
            </h2>
            {data.subscribers.length === 0 ? (
              <p className="text-sm text-slate-400">登録者がいません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      <th className="pb-2 pr-4 font-semibold">メールアドレス</th>
                      <th className="pb-2 pr-4 font-semibold">業種</th>
                      <th className="pb-2 font-semibold">登録日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.subscribers.map((sub) => (
                      <tr key={sub.email} className="hover:bg-slate-50">
                        <td className="py-2 pr-4 font-mono text-slate-700">{sub.email}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${INDUSTRY_COLORS[sub.industry] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {sub.industry}
                          </span>
                        </td>
                        <td className="py-2 text-slate-400">
                          {new Date(sub.subscribedAt).toLocaleDateString("ja-JP")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
