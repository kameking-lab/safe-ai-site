"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CloudRain, Scale, Sparkles, Loader2, ExternalLink, RefreshCw, LifeBuoy } from "lucide-react";
// C-1（モバイル実速度の構造是正）: 事故データセット・法改正データ・JMA警報JSONの
// 静的 import とクライアント側選定を廃止。選定は lib/home-three-pillars-data.ts
// （server）が行い、page.tsx から小さな結果だけを props で受け取る。
// "/" は全ページからリンクされるため、RSC プリフェッチで全ページが
// このデータチャンク（生約340KB+）を落とす構造になっていた。
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";
import type { WarningEntry } from "@/lib/home-three-pillars-data";
import { useLanguage } from "@/contexts/language-context";
import { StatusBadge } from "@/components/ui/status-badge";

type AlertKind = "fatal-accident" | "weather" | "law-revision";

function extractAccidentSourceUrl(c: AccidentCase): string | null {
  if (c.source?.url) return c.source.url.startsWith("http") ? c.source.url : `https://${c.source.url}`;
  const m = c.summary.match(/出典:\s*([^\s]+)/);
  if (!m) return null;
  const url = m[1];
  return url.startsWith("http") ? url : `https://${url}`;
}

export function HomeThreePillars({
  fatal,
  lawRevisions,
  warnings,
}: {
  fatal: AccidentCase | null;
  lawRevisions: LawRevisionCore[];
  warnings: WarningEntry[];
}) {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <section className="space-y-4">
      <header className="px-1">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">
          {isEn ? "Today's safety topics" : "本日の安全トピック"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {isEn
            ? "Latest fatal accident, weather warnings, and law amendments at a glance. Generate a morning-briefing alert from each item using AI."
            : "直近の死亡事故・気象警報・法改正の3項目をまとめて把握。各項目から朝礼用の注意喚起文をAIで生成できます。"}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <PillarFatalAccident fatal={fatal} />
        <PillarWeather warnings={warnings} />
        <PillarLawRevisions revisions={lawRevisions} />
      </div>
    </section>
  );
}

function PillarFatalAccident({ fatal }: { fatal: AccidentCase | null }) {
  const sourceUrl = fatal ? extractAccidentSourceUrl(fatal) : null;
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <article className="flex flex-col rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-rose-700">
            {isEn ? "A. Latest fatal accident" : "A. 直近の死亡事故"}
          </p>
          <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900">
            {fatal ? fatal.title : isEn ? "No fatal cases currently published" : "現在公開中の死亡事例はありません"}
          </h3>
        </div>
      </div>

      {fatal && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-800">
              {fatal.workCategory}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
              {fatal.type}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
              {fatal.occurredOn}
            </span>
          </div>
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{fatal.summary}</p>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {isEn ? "Open press source" : "出典・報道URLを開く"}
            </a>
          )}

          <AlertGenerator
            kind="fatal-accident"
            title={fatal.title}
            context={`業種: ${fatal.workCategory} / 種別: ${fatal.type} / 主因: ${(fatal.mainCauses ?? []).join("、")}`}
            accent="rose"
          />
        </>
      )}

      {/* メイン3機能: 業種別事故分析レポートを主動線とし、10年DB一覧はセカンダリに格下げ */}
      <Link
        href="/accidents-reports"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
      >
        {isEn ? "Industry accident reports →" : "業種別 事故分析レポートへ →"}
      </Link>
      <Link
        href="/accidents"
        className="mt-1.5 inline-flex items-center justify-center text-[11px] font-semibold text-rose-700/80 hover:text-rose-800 hover:underline"
      >
        {isEn ? "10-year accident DB list →" : "10年事故DB一覧へ →"}
      </Link>
    </article>
  );
}

function PillarWeather({ warnings }: { warnings: WarningEntry[] }) {
  const hasWarning = warnings.some((w) => w.level === "warning");
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <article className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
          <CloudRain className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
            {isEn ? "B. Severe weather this week" : "B. 1週間の警報級悪天候"}
          </p>
          {/* 共通視覚言語（柱0-0）: 気象庁の色文法と同じく 警報=赤 / 注意報=黄 / なし=緑 */}
          <StatusBadge
            tone={hasWarning ? "danger" : warnings.length > 0 ? "warning" : "safe"}
            size="sm"
            className="mt-1"
          >
            {hasWarning
              ? isEn
                ? "Warning in effect"
                : "警報 発表中"
              : warnings.length > 0
                ? isEn
                  ? "Advisory only"
                  : "注意報のみ"
                : isEn
                  ? "All clear"
                  : "警報・注意報なし"}
          </StatusBadge>
          <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900">
            {hasWarning
              ? isEn
                ? "Warning-level severe weather in effect"
                : "警報級の悪天候が発表中"
              : warnings.length > 0
                ? isEn
                  ? "Advisories only (no warnings)"
                  : "注意報のみ（警報はなし）"
                : isEn
                  ? "No special warnings or advisories at this time"
                  : "現在、特別な警報・注意報はありません"}
          </h3>
        </div>
      </div>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {warnings.map((w) => (
            <li key={w.iso} className="text-xs leading-5 text-slate-700">
              <span
                className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  w.level === "warning"
                    ? "bg-amber-200 text-amber-900"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {w.level === "warning"
                  ? isEn
                    ? "Warning"
                    : "警報"
                  : isEn
                    ? "Advisory"
                    : "注意報"}
              </span>
              <span className="font-semibold">{w.prefecture}</span>
              <span className="ml-1 text-slate-600">{w.headline.slice(0, 60)}</span>
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <AlertGenerator
          kind="weather"
          title={
            hasWarning
              ? `${warnings[0].prefecture} ほか ${warnings.length} 地域で警報発表`
              : `${warnings[0].prefecture} ほかで注意報発表`
          }
          context={warnings.map((w) => `${w.prefecture}: ${w.headline}`).join("\n")}
          accent="amber"
        />
      )}

      <Link
        href="/risk"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50"
      >
        {isEn ? "Weather risk detail →" : "気象リスク詳細を見る →"}
      </Link>
    </article>
  );
}

function PillarLawRevisions({ revisions }: { revisions: LawRevisionCore[] }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <article className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
          <Scale className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
            {isEn ? "C. Recent 3 law amendments" : "C. 直近の法改正3件"}
          </p>
          <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900">
            {revisions.length > 0
              ? isEn
                ? `Showing ${revisions.length} amendment${revisions.length === 1 ? "" : "s"}`
                : `${revisions.length}件の改正情報を表示中`
              : isEn
                ? "No amendment data available"
                : "現在表示できる改正情報はありません"}
          </h3>
        </div>
      </div>

      {revisions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {revisions.map((r) => (
            <li key={r.id} className="rounded-lg border border-emerald-100 bg-white p-2.5">
              <p className="text-xs font-bold text-slate-900">{r.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {isEn ? "Effective" : "施行日"}: {r.enforcement_date || r.publishedAt} / {r.issuer}
              </p>
              <AlertGenerator
                kind="law-revision"
                title={r.title}
                context={`施行日: ${r.enforcement_date || r.publishedAt} / 概要: ${r.summary}`}
                accent="emerald"
                compact
              />
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/laws"
        className="mt-3 inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
      >
        {isEn ? "Law amendments list →" : "法改正一覧を見る →"}
      </Link>
    </article>
  );
}

function AlertGenerator({
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
  const { language } = useLanguage();
  const isEn = language === "en";

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
        setError(data.error ?? (isEn ? "Generation failed." : "生成に失敗しました。"));
        setFailureCount((c) => c + 1);
      } else {
        setAlert(data.alert);
        setFailureCount(0);
      }
    } catch {
      setError(isEn ? "Network error occurred." : "ネットワークエラーが発生しました。");
      setFailureCount((c) => c + 1);
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
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${accentClasses[accent]} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        {loading ? (isEn ? "Generating…" : "生成中…") : (isEn ? "Generate alert text" : "注意喚起文を作成")}
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
            {isEn
              ? "Possible causes: API rate limit, temporary network issue, or upstream service unavailable."
              : "考えられる原因: AI APIの利用上限、一時的なネットワーク不調、サービス側の停止。"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-3 w-3" />
              {isEn ? "Retry" : "再試行"}
            </button>
            {showContactCta && (
              <Link
                href="/contact"
                className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-900 hover:bg-rose-200"
              >
                <LifeBuoy className="h-3 w-3" />
                {isEn ? "Contact administrator" : "管理者に連絡（3回連続失敗）"}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
