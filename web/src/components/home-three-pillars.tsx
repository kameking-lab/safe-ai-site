"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CloudRain, Scale, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import { realLawRevisions } from "@/data/mock/real-law-revisions";
import { realLawRevisionsExtra } from "@/data/mock/real-law-revisions-extra";
import warningsData from "@/data/jma/warnings.json";
import type { AccidentCase, LawRevisionCore } from "@/lib/types/domain";
import { useLanguage } from "@/contexts/language-context";

type WarningLevel = "warning" | "advisory" | "none";

type WarningEntry = {
  iso: string;
  prefecture: string;
  level: WarningLevel;
  headline: string;
  reportDatetime?: string;
};

type AlertKind = "fatal-accident" | "weather" | "law-revision";

const PREFECTURE_LABELS: Record<string, string> = {
  "JP-01": "北海道",
  "JP-02": "青森県",
  "JP-03": "岩手県",
  "JP-04": "宮城県",
  "JP-05": "秋田県",
  "JP-06": "山形県",
  "JP-07": "福島県",
  "JP-08": "茨城県",
  "JP-09": "栃木県",
  "JP-10": "群馬県",
  "JP-11": "埼玉県",
  "JP-12": "千葉県",
  "JP-13": "東京都",
  "JP-14": "神奈川県",
  "JP-15": "新潟県",
  "JP-16": "富山県",
  "JP-17": "石川県",
  "JP-18": "福井県",
  "JP-19": "山梨県",
  "JP-20": "長野県",
  "JP-21": "岐阜県",
  "JP-22": "静岡県",
  "JP-23": "愛知県",
  "JP-24": "三重県",
  "JP-25": "滋賀県",
  "JP-26": "京都府",
  "JP-27": "大阪府",
  "JP-28": "兵庫県",
  "JP-29": "奈良県",
  "JP-30": "和歌山県",
  "JP-31": "鳥取県",
  "JP-32": "島根県",
  "JP-33": "岡山県",
  "JP-34": "広島県",
  "JP-35": "山口県",
  "JP-36": "徳島県",
  "JP-37": "香川県",
  "JP-38": "愛媛県",
  "JP-39": "高知県",
  "JP-40": "福岡県",
  "JP-41": "佐賀県",
  "JP-42": "長崎県",
  "JP-43": "熊本県",
  "JP-44": "大分県",
  "JP-45": "宮崎県",
  "JP-46": "鹿児島県",
  "JP-47": "沖縄県",
};

function pickLatestFatalAccident(): AccidentCase | null {
  const today = new Date().toISOString().slice(0, 10);
  const fatal = getAccidentCasesDataset().filter(
    (c) => c.severity === "死亡" && c.occurredOn <= today
  );
  if (fatal.length === 0) return null;
  return [...fatal].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0] ?? null;
}

function pickRecentLawRevisions(): LawRevisionCore[] {
  const merged = [...realLawRevisions, ...realLawRevisionsExtra];
  return [...merged]
    .sort((a, b) => {
      const aKey = a.enforcement_date || a.publishedAt;
      const bKey = b.enforcement_date || b.publishedAt;
      return bKey.localeCompare(aKey);
    })
    .slice(0, 3);
}

function pickWarningWeather(): WarningEntry[] {
  type WarningsShape = {
    byIso?: Record<
      string,
      {
        level?: string;
        entries?: { headline?: string; level?: string; reportDatetime?: string }[];
      }
    >;
  };
  const data = warningsData as WarningsShape;
  if (!data.byIso) return [];
  const all: WarningEntry[] = Object.entries(data.byIso).map(([iso, v]) => {
    const headline = v.entries?.[0]?.headline ?? "";
    const reportDatetime = v.entries?.[0]?.reportDatetime;
    const level = (v.level as WarningLevel) ?? "none";
    return {
      iso,
      prefecture: PREFECTURE_LABELS[iso] ?? iso,
      level,
      headline,
      reportDatetime,
    };
  });
  const warnings = all.filter((e) => e.level === "warning");
  if (warnings.length > 0) return warnings.slice(0, 5);
  // 警報がない場合は注意報を最大3件表示（屋外作業の参考として）
  return all.filter((e) => e.level === "advisory" && e.headline).slice(0, 3);
}

function extractAccidentSourceUrl(c: AccidentCase): string | null {
  if (c.source?.url) return c.source.url.startsWith("http") ? c.source.url : `https://${c.source.url}`;
  const m = c.summary.match(/出典:\s*([^\s]+)/);
  if (!m) return null;
  const url = m[1];
  return url.startsWith("http") ? url : `https://${url}`;
}

export function HomeThreePillars() {
  const fatal = useMemo(() => pickLatestFatalAccident(), []);
  const lawRevisions = useMemo(() => pickRecentLawRevisions(), []);
  const warnings = useMemo(() => pickWarningWeather(), []);
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
      } else {
        setAlert(data.alert);
      }
    } catch {
      setError(isEn ? "Network error occurred." : "ネットワークエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

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
        <p className="mt-1.5 text-[11px] text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
