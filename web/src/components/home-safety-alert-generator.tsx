"use client";

import { useState } from "react";
import Link from "next/link";
import { LifeBuoy, Loader2, RefreshCw, Sparkles } from "lucide-react";

type AlertKind = "fatal-accident" | "weather" | "law-revision";

export function HomeSafetyAlertGenerator({
  kind,
  title,
  context,
  accent,
  compact = false,
}: {
  kind: AlertKind;
  title: string;
  context?: string;
  accent: "rose" | "amber" | "emerald";
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failureCount, setFailureCount] = useState(0);

  const accentClasses: Record<typeof accent, string> = {
    rose: "border-rose-300 bg-white text-rose-800 hover:bg-rose-50",
    amber: "border-amber-300 bg-white text-amber-800 hover:bg-amber-50",
    emerald: "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50",
  };

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/safety-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, context }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        alert?: string;
        error?: string;
      };
      if (!res.ok || !data.alert) {
        setError(data.error ?? "生成に失敗しました。");
        setFailureCount((count) => count + 1);
      } else {
        setAlert(data.alert);
        setFailureCount(0);
      }
    } catch {
      setError("ネットワークエラーが発生しました。");
      setFailureCount((count) => count + 1);
    } finally {
      setLoading(false);
    }
  }

  const showContactCta = failureCount >= 3;

  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className={`inline-flex min-h-[44px] items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${accentClasses[accent]} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {loading ? "生成中…" : "注意喚起文を作成"}
      </button>

      {alert && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-5 text-slate-700">
          <pre className="whitespace-pre-wrap font-sans">{alert}</pre>
        </div>
      )}
      {error && (
        <div className="mt-1.5 rounded-md border border-rose-200 bg-rose-50/60 p-2 text-[11px] leading-5 text-rose-800" role="alert">
          <p className="font-semibold">{error}</p>
          <p className="mt-1 text-rose-700/90">
            考えられる原因: AI APIの利用上限、一時的なネットワーク不調、サービス側の停止。
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-rose-300 bg-white px-3 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-3 w-3" />
              再試行
            </button>
            {showContactCta && (
              <Link
                href="/contact"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-900 hover:bg-rose-200"
              >
                <LifeBuoy className="h-3 w-3" />
                管理者に連絡（3回連続失敗）
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
