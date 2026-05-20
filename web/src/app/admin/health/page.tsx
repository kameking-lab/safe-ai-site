import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { checkAllServices, type ServiceHealth } from "@/lib/external/health";

export const metadata: Metadata = {
  title: "外部依存ヘルスチェック 内部",
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

export const dynamic = "force-dynamic";

const VALID_KEY = process.env.ADMIN_HEALTH_KEY ?? "";

const STATUS_BADGE: Record<ServiceHealth["status"], { label: string; bg: string; fg: string }> = {
  ok: { label: "OK", bg: "bg-emerald-100", fg: "text-emerald-800" },
  degraded: { label: "DEGRADED", bg: "bg-amber-100", fg: "text-amber-800" },
  down: { label: "DOWN", bg: "bg-red-100", fg: "text-red-800" },
  not_configured: { label: "NOT CONFIGURED", bg: "bg-slate-100", fg: "text-slate-700" },
};

const CIRCUIT_BADGE: Record<ServiceHealth["circuit"]["state"], { label: string; bg: string }> = {
  closed: { label: "closed", bg: "bg-emerald-50 text-emerald-700" },
  half_open: { label: "half-open", bg: "bg-amber-50 text-amber-700" },
  open: { label: "OPEN", bg: "bg-red-50 text-red-700" },
  unknown: { label: "—", bg: "bg-slate-50 text-slate-500" },
};

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminHealthPage({ searchParams }: Props) {
  const params = await searchParams;
  if (!VALID_KEY || params.key !== VALID_KEY) {
    notFound();
  }

  const services = await checkAllServices();
  const generatedAt = new Date().toISOString();
  const okCount = services.filter((s) => s.status === "ok").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const downCount = services.filter((s) => s.status === "down").length;
  const notConfiguredCount = services.filter((s) => s.status === "not_configured").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-800 text-white px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs text-slate-400 mb-1">安全AIポータル 内部 / noindex</p>
          <h1 className="text-xl font-bold leading-snug">外部依存サービス ヘルスチェック</h1>
          <p className="text-sm text-slate-300 mt-1">
            生成: {generatedAt} / OK {okCount} / DEGRADED {degradedCount} / DOWN {downCount} / 未設定{" "}
            {notConfiguredCount}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            各サービスにライブ呼び出しを行い、現在の到達性とサーキットブレーカーの状態を表示します。
            <strong>OK</strong> 以外のサービスは「フォールバック挙動」列に書かれた挙動でサイトの利用は継続します。
          </p>
          <p className="mt-2 text-xs text-slate-500">
            JSON が必要な場合: <code>/api/admin/health?key=...</code>
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">サービス</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">レイテンシ</th>
                <th className="px-4 py-3">サーキット</th>
                <th className="px-4 py-3">詳細</th>
                <th className="px-4 py-3">フォールバック挙動</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((s) => {
                const badge = STATUS_BADGE[s.status];
                const circuit = CIRCUIT_BADGE[s.circuit.state];
                return (
                  <tr key={s.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.label}</div>
                      <div className="text-xs text-slate-500">{s.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.fg}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.latencyMs === null ? "—" : `${s.latencyMs} ms`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-mono ${circuit.bg}`}>
                        {circuit.label}
                      </span>
                      {s.circuit.consecutiveFailures > 0 && (
                        <div className="mt-1 text-xs text-red-600">
                          失敗 {s.circuit.consecutiveFailures} 回
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="text-xs">{s.detail}</div>
                      {s.circuit.lastErrorMessage && (
                        <div className="mt-1 text-xs text-red-500">
                          直近エラー: {s.circuit.lastErrorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{s.fallbackBehavior}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          <p>
            <strong>状態の定義:</strong> OK=ライブ呼び出し成功 / DEGRADED=応答はあるが品質劣化（クォータ・認証等） /
            DOWN=接続不可 / NOT CONFIGURED=環境変数未設定（フォールバックモードで稼働中）。
          </p>
          <p className="mt-2">
            <strong>サーキット状態:</strong> closed=正常 / half-open=試行中 / OPEN=一定時間スキップ中。
            サーキットがOPENの間、当該サービスへの呼び出しはフォールバックに切り替わります。
          </p>
        </div>
      </div>
    </div>
  );
}
