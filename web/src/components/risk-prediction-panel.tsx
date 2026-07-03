"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { InputWithVoice, TextareaWithVoice } from "@/components/voice-input-field";
// C-1（モバイル実速度の構造是正）: 事故データセット（生約340KB）を静的 import すると
// /risk-prediction の client バンドルに同梱され、本ページへ Link する全ページ
// （/accidents 等）の RSC プリフェッチでもダウンロードされる。マウント後に
// dynamic import で遅延取得する（検索・チップ・月次傾向の挙動は不変）。
import type { AccidentCase } from "@/lib/types/domain";

async function loadAccidentCasesDataset(): Promise<AccidentCase[]> {
  const mod = await import("@/data/mock/accident-cases");
  return mod.getAccidentCasesDataset();
}

const MhlwSimilarCasesPanel = dynamic(
  () =>
    import("@/components/mhlw-similar-cases-panel").then(
      (m) => m.MhlwSimilarCasesPanel
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
    ),
  }
);
import {
  buildRiskMatrix,
  computeIndustryTrends,
  computeMonthlyTrends,
  computeSafetyScore,
  searchAccidentCases,
} from "@/lib/utils/risk-search";
import type { RiskLevel, ScoredAccidentCase, SafetyScore } from "@/lib/utils/risk-search";
import {
  computeRiskPredictionConclusion,
  riskScoreMarkerPercent,
  RISK_BAND_SEGMENTS,
  RISK_LEVEL_VISUAL,
} from "@/lib/risk/risk-prediction-visual";
import { StatusBadge } from "@/components/ui/status-badge";
import { TONE_DEFAULT_ICON } from "@/components/ui/status-badge";

// ---------- 色ヘルパー ----------

function riskBadgeClass(level: RiskLevel) {
  switch (level) {
    case "高": return "bg-rose-100 text-rose-700 border-rose-200";
    case "中": return "bg-amber-100 text-amber-700 border-amber-200";
    case "低": return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
}

function riskBorderClass(level: RiskLevel) {
  switch (level) {
    case "高": return "border-rose-300";
    case "中": return "border-amber-300";
    case "低": return "border-emerald-300";
  }
}

function matrixCellColor(severity: number, frequency: number): string {
  const risk = severity * frequency;
  if (risk >= 16) return "bg-rose-600 text-white";
  if (risk >= 9) return "bg-orange-400 text-white";
  if (risk >= 4) return "bg-amber-300 text-slate-800";
  return "bg-emerald-100 text-slate-600";
}

// ---------- サブコンポーネント ----------

type TabId = "search" | "trends" | "matrix" | "score";

function TabButton({ id, activeTab, label, onClick }: { id: TabId; activeTab: TabId; label: string; onClick: (id: TabId) => void }) {
  const active = id === activeTab;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex-1 min-h-[44px] inline-flex items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm ${
        active ? "bg-emerald-600 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * 検索直後に一目で「スコア＋主要対策」を見せるカード。
 * 詳細はタブで切替可能だが、このカードで意思決定できることを目指す。
 */
function TopSummaryCard({
  score,
  results,
  onShowDetail,
}: {
  score: SafetyScore;
  results: ScoredAccidentCase[];
  onShowDetail: () => void;
}) {
  const topPreventions = useMemo(() => {
    const seen = new Set<string>();
    const out: { point: string; from: string }[] = [];
    for (const c of results) {
      for (const p of c.preventionPoints) {
        const key = p.slice(0, 24);
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ point: p, from: c.title });
          if (out.length >= 3) break;
        }
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [results]);

  const severeCount = results.filter((c) => c.severity === "死亡" || c.severity === "重傷").length;
  const conclusion = computeRiskPredictionConclusion(score);
  const v = conclusion.visual;
  const ToneIcon = TONE_DEFAULT_ICON[v.tone];

  return (
    <section
      role="status"
      aria-label={`判定結果: ${conclusion.title}`}
      data-testid="risk-conclusion"
      className={`rounded-2xl border-2 p-4 shadow-sm sm:p-5 ${v.soft}`}
    >
      {/* 主役: 安全スコアのデカ数字＋リスクレベルのチップ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ToneIcon className={`h-8 w-8 shrink-0 ${v.text}`} aria-hidden="true" />
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              data-testid="risk-big-value"
              className={`text-5xl font-bold leading-none tracking-tight ${v.text}`}
            >
              {conclusion.big}
              <span className="ml-0.5 text-xl font-bold opacity-70">/100</span>
            </span>
            <span
              data-testid="risk-conclusion-chip"
              className={`rounded-full px-2.5 py-1 text-sm font-bold ${v.chip}`}
            >
              {conclusion.title}
            </span>
            {severeCount > 0 && (
              <StatusBadge tone="danger" size="sm">
                類似の死亡・重傷 {severeCount}件
              </StatusBadge>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onShowDetail}
          className="shrink-0 rounded-lg border border-white/50 bg-white/70 px-3 py-2 text-xs font-semibold hover:bg-white/90"
        >
          詳細スコアを見る →
        </button>
      </div>

      {/* 低→中→高 の色帯（しきい値30/60と一致・スコア位置に▼）。印刷では出さない */}
      <div className="mt-3 print:hidden" data-testid="risk-level-band">
        <div className="relative pt-3">
          <span
            aria-hidden="true"
            className="absolute top-0 -translate-x-1/2 text-xs font-bold"
            style={{ left: `${riskScoreMarkerPercent(conclusion.big)}%` }}
          >
            ▼
          </span>
          <div className="flex h-3 overflow-hidden rounded-full">
            {RISK_BAND_SEGMENTS.map((seg) => (
              <span
                key={seg.level}
                data-testid={`risk-band-seg-${seg.level}`}
                className={`h-full ${RISK_LEVEL_VISUAL[seg.level].bar}`}
                style={{ width: `${seg.widthPct}%` }}
              />
            ))}
          </div>
          <div className="mt-0.5 flex text-[10px] font-semibold opacity-70">
            {RISK_BAND_SEGMENTS.map((seg) => (
              <span key={seg.level} style={{ width: `${seg.widthPct}%` }} className="text-center">
                {seg.level}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 次にやること: 短アクション＋根拠コメント */}
      <p className="mt-3 text-sm font-bold">
        次にやること：{conclusion.shortAction}
      </p>
      <p className="mt-1 text-sm leading-relaxed opacity-90">{score.comment}</p>

      {topPreventions.length > 0 && (
        <div className="mt-3 rounded-xl bg-white/70 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">今朝の主要対策（上位3件）</p>
          <ul className="mt-1.5 space-y-1 text-sm leading-relaxed">
            {topPreventions.map((p, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                  {idx + 1}
                </span>
                <span className="text-slate-800">{p.point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// 事故カード
function AccidentCard({ c, index }: { c: ScoredAccidentCase; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border p-3 ${riskBorderClass(c.riskLevel)} bg-white shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400">#{index + 1}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskBadgeClass(c.riskLevel)}`}>
              {c.riskLevel}リスク
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{c.type}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{c.workCategory}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              c.severity === "死亡" ? "bg-rose-700 text-white"
              : c.severity === "重傷" ? "bg-rose-100 text-rose-700"
              : c.severity === "中等傷" ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600"
            }`}>{c.severity}</span>
          </div>
          <h3 className="mt-1.5 text-sm font-bold leading-snug text-slate-800">{c.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{c.summary}</p>
        </div>
      </div>

      {c.matchedKeywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {c.matchedKeywords.slice(0, 5).map((kw) => (
            <span key={kw} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
              {kw}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
      >
        {open ? "▲ 閉じる" : "▼ 原因・対策を見る"}
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
          {c.mainCauses.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-rose-600">主な原因</p>
              <ul className="mt-1 space-y-0.5">
                {c.mainCauses.map((cause, i) => (
                  <li key={i} className="text-xs text-slate-700 before:mr-1 before:content-['•']">{cause}</li>
                ))}
              </ul>
            </div>
          )}
          {c.preventionPoints.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-emerald-600">防止対策</p>
              <ul className="mt-1 space-y-0.5">
                {c.preventionPoints.map((pt, i) => (
                  <li key={i} className="text-xs text-slate-700 before:mr-1 before:content-['✓']">{pt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 安全スコアパネル
function SafetyScorePanel({ score, query }: { score: SafetyScore; query: string }) {
  // 結論カードと同じ色トークン（risk-prediction-visual.ts）で塗り、色の文法を一致させる
  const gaugeColor = RISK_LEVEL_VISUAL[score.riskLevel].bar;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-bold text-slate-800 sm:text-base">安全スコアダッシュボード</h3>
      {query && (
        <p className="mt-0.5 text-xs text-slate-500">
          作業: <span className="font-semibold text-slate-700">{query}</span>
        </p>
      )}

      {/* 総合スコアゲージ */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>リスク指数</span>
          <span className={`rounded-full px-3 py-0.5 text-white text-sm ${gaugeColor}`}>
            {score.overall}/100 ({score.riskLevel}リスク)
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-700 ${gaugeColor}`}
            style={{ width: `${score.overall}%` }}
          />
        </div>
      </div>

      {/* コメント */}
      <p className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
        score.riskLevel === "高" ? "border-rose-200 bg-rose-50 text-rose-800"
          : score.riskLevel === "中" ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}>
        {score.comment}
      </p>

      {/* 内訳 */}
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-slate-600">リスク内訳</p>
        {score.breakdown.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>{item.label}</span>
              <span className="font-semibold">{item.score}/{item.maxScore}</span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.color}`}
                style={{ width: `${(item.score / item.maxScore) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 月別トレンドパネル
function MonthlyTrendsPanel({ cases }: { cases: AccidentCase[] }) {
  const trends = useMemo(() => computeMonthlyTrends(cases), [cases]);
  const maxCount = Math.max(...trends.map((t) => t.count), 1);
  const industryTrends = useMemo(() => computeIndustryTrends(cases).slice(0, 8), [cases]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-bold text-slate-800 sm:text-base">月別事故発生トレンド</h3>
        <p className="mt-0.5 text-xs text-slate-500">事故DBデータ（{cases.length}件）の月別集計</p>
        <div className="mt-4 flex items-end gap-1">
          {trends.map((t) => {
            const pct = (t.count / maxCount) * 100;
            const isHighMonth = t.month === 7 || t.month === 8 || t.month === 12;
            return (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[9px] text-slate-500">{t.count}</span>
                <div
                  className={`w-full rounded-t ${isHighMonth ? "bg-rose-400" : "bg-emerald-400"}`}
                  style={{ height: `${Math.max(4, pct * 0.8)}px`, minHeight: "4px" }}
                  title={`${t.label}: ${t.count}件 (最多: ${t.topType ?? "-"})`}
                />
                <span className="text-[8px] text-slate-400">{t.label.replace("月", "")}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-400">赤色: 事故多発月（7・8月夏季、12月年末）</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-bold text-slate-800 sm:text-base">業種別事故傾向</h3>
        <div className="mt-3 space-y-2">
          {industryTrends.map((t) => {
            const pct = (t.count / (industryTrends[0]?.count ?? 1)) * 100;
            return (
              <div key={t.category}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{t.category}</span>
                  <span className="text-slate-500">
                    {t.count}件
                    {t.deathCount > 0 && (
                      <span className="ml-1 text-rose-600">（死亡{t.deathCount}件）</span>
                    )}
                  </span>
                </div>
                <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {t.topType && (
                  <p className="text-[10px] text-slate-400">最多: {t.topType}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// リスクマトリクスパネル
function RiskMatrixPanel({ cases }: { cases: ScoredAccidentCase[] }) {
  const matrix = useMemo(() => buildRiskMatrix(cases), [cases]);
  const SEV_LABELS = ["軽傷", "中等傷", "重傷", "死亡"];
  const FREQ_LABELS = ["低", "やや低", "中", "やや高", "高"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-bold text-slate-800 sm:text-base">リスクマトリクス（頻度×重大性）</h3>
      <p className="mt-0.5 text-xs text-slate-500">検索結果の事故事例をマトリクス上に分類しています</p>
      {cases.length === 0 ? (
        <p className="mt-4 text-center text-xs text-slate-400">作業内容を入力して検索するとマトリクスが表示されます</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-center text-[10px]">
            <thead>
              <tr>
                <th className="p-1 text-left text-slate-500" />
                {FREQ_LABELS.map((f) => (
                  <th key={f} className="p-1 text-slate-500">{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...matrix].reverse().map((row, ri) => {
                const sevIdx = 3 - ri;
                return (
                  <tr key={sevIdx}>
                    <td className="pr-2 text-left text-slate-500">{SEV_LABELS[sevIdx]}</td>
                    {row.map((cell) => (
                      <td key={cell.frequency} className="p-0.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold ${matrixCellColor(cell.severity, cell.frequency)} mx-auto`}
                          title={cell.cases.map((c) => c.title).join("\n")}
                        >
                          {cell.count > 0 ? cell.count : ""}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-rose-600" />高リスク</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-orange-400" />中高リスク</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-300" />中リスク</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-100 border border-slate-200" />低リスク</span>
          </div>
        </div>
      )}
    </div>
  );
}

// PDF印刷用エリア（print:block）
function PrintableReport({
  query,
  results,
  score,
  siteName,
  date,
}: {
  query: string;
  results: ScoredAccidentCase[];
  score: SafetyScore | null;
  siteName: string;
  date: string;
}) {
  return (
    <div className="hidden print:block print:text-black">
      <div className="mb-4 border-b-2 border-gray-800 pb-2">
        {/* 印刷帳票の表題。画面側 PageHeader の h1 と重複させない（多重h1の是正）ため
            見出し要素にせず、正式書式の見た目（太字大）だけを保つ。 */}
        <p className="text-xl font-bold">朝礼KY資料 - AIリスク予測レポート</p>
        <div className="mt-1 flex gap-6 text-sm">
          <span>日付: {date}</span>
          {siteName && <span>現場名: {siteName}</span>}
          <span>作業内容: {query}</span>
        </div>
      </div>

      {score && (
        <div className="mb-4">
          <h2 className="text-base font-bold">リスク指数: {score.overall}/100 ({score.riskLevel}リスク)</h2>
          <p className="mt-1 text-sm">{score.comment}</p>
        </div>
      )}

      <h2 className="mb-2 text-base font-bold">類似事故事例 ({results.length}件)</h2>
      {results.slice(0, 10).map((c, i) => (
        <div key={c.id} className="mb-3 border border-gray-300 p-2 text-sm">
          <p className="font-bold">{i + 1}. [{c.riskLevel}リスク] {c.title}</p>
          <p className="text-xs text-gray-600">事故の型: {c.type} / 業種: {c.workCategory} / 重篤度: {c.severity}</p>
          <p className="mt-1">{c.summary}</p>
          {c.mainCauses.length > 0 && (
            <p className="mt-1"><strong>原因:</strong> {c.mainCauses.slice(0, 2).join("・")}</p>
          )}
          {c.preventionPoints.length > 0 && (
            <p><strong>対策:</strong> {c.preventionPoints.slice(0, 2).join("・")}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- メインコンポーネント ----------

// 朝礼5分前の職長向け：業種・工種を1タップで呼び出すチップ
const QUICK_WORK_CHIPS: { label: string; query: string }[] = [
  { label: "足場", query: "足場の組立・解体作業" },
  { label: "高所", query: "高所作業（2m以上の墜落防止）" },
  { label: "電気", query: "電気設備・活線近接作業" },
  { label: "解体", query: "解体・はつり作業" },
  { label: "重機", query: "バックホー・クレーン等の重機作業" },
  { label: "運搬", query: "玉掛け・荷役・運搬作業" },
  { label: "化学", query: "有機溶剤・特化物の取扱い作業" },
  { label: "酸欠", query: "閉所・酸素欠乏危険作業" },
];

// 従来のサンプル文（補助的に残す）
const QUICK_EXAMPLES = [
  "高所での鉄骨組立作業",
  "足場解体",
  "電気設備点検",
  "クレーン作業",
  "屋根防水工事",
  "化学薬品取扱い",
];

export function RiskPredictionPanel() {
  const [allCases, setAllCases] = useState<AccidentCase[]>([]);
  useEffect(() => {
    let active = true;
    void loadAccidentCasesDataset().then((cases) => {
      if (active) setAllCases(cases);
    });
    return () => {
      active = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const [siteName, setSiteName] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [results, setResults] = useState<ScoredAccidentCase[]>([]);
  const [searched, setSearched] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  // 判定後、結論カードを画面最上部に出す（柱0: 入力の下→最上部）。
  // チップは画面中ほどにあり、タップ後のスクロール位置のままだと結論カードを
  // 見落とすため、検索完了時にカード先頭へスクロールして「3秒で分かる」を担保。
  const conclusionRef = useRef<HTMLDivElement>(null);

  // データロード完了前のクリックでも0件にならないよう、検索系は常に
  // loadAccidentCasesDataset() を経由する（2回目以降は import キャッシュで即時解決）
  const runSearch = useCallback((q: string) => {
    void loadAccidentCasesDataset().then((cases) => {
      const found = searchAccidentCases(q, cases, 30);
      setResults(found);
      setSearched(true);
      setActiveTab("search");
      requestAnimationFrame(() => {
        conclusionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }, []);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    runSearch(query);
  }, [query, runSearch]);

  const safetyScore = useMemo(() => {
    if (!searched) return null;
    return computeSafetyScore({ query, matchedCases: results });
  }, [searched, query, results]);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pb-8 pt-4 lg:px-8">
      {/* 印刷用レポート（画面では非表示） */}
      <PrintableReport
        query={query}
        results={results}
        score={safetyScore}
        siteName={siteName}
        date={today}
      />

      {/* 判定結果の結論カード（柱0: 1画面1メッセージ・最上部）。
          検索後は入力より上に出し、3秒で「スコア＋リスクレベル＋次にやること」が目に入る。 */}
      <div ref={conclusionRef} className="scroll-mt-4">
        {searched && safetyScore && (
          <TopSummaryCard score={safetyScore} results={results} onShowDetail={() => setActiveTab("score")} />
        )}
      </div>

      {/* 検索入力エリア */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">AIリスク予測</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              作業内容を入力すると、事故DBから類似事例を検索し、リスクを予測します
            </p>
          </div>
          {searched && results.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  // 上位3件のリスクをペイロードにしてKY用紙に転記
                  try {
                    const payload = {
                      query,
                      generatedAt: new Date().toISOString(),
                      risks: results.slice(0, 3).map((c) => ({
                        targetLabel: c.title.slice(0, 30),
                        hazard:
                          c.mainCauses[0]
                            ? `${c.title}：${c.mainCauses[0]}`
                            : c.title,
                        reduction:
                          c.preventionPoints[0] ?? "（対策を確認のうえ追記）",
                      })),
                    };
                    window.localStorage.setItem(
                      "ky-import-payload",
                      JSON.stringify(payload)
                    );
                  } catch {}
                  window.location.href = "/ky?import=risk-prediction";
                }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                title="検索結果の上位3件をKY用紙の危険要因・対策欄に自動転記します"
              >
                このリスクをKY用紙に転記 →
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                PDF出力（朝礼資料）
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700" htmlFor="risk-query">
              作業内容
            </label>
            <TextareaWithVoice
              id="risk-query"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="例: 高所での鉄骨組立作業、足場解体、電気工事など"
              rows={2}
              maxLength={500}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <p className={`text-right text-[11px] ${query.length >= 490 ? "text-rose-500 font-semibold" : "text-slate-400"}`}>
              {query.length}/500文字
            </p>
            <InputWithVoice
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="現場名（任意 - PDF出力時に記載）"
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>
          <div className="flex flex-col justify-end">
            <button
              type="button"
              className="h-full min-h-[44px] rounded-xl bg-emerald-600 px-6 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 sm:text-base"
              onClick={handleSearch}
              disabled={!query.trim()}
            >
              検索
            </button>
          </div>
        </div>

        {/* 業種・工種チップ（朝礼5分前の1タップ呼び出し） */}
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-slate-600">
            業種・工種から呼び出す（1タップ）:
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {QUICK_WORK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setQuery(chip.query);
                  runSearch(chip.query);
                }}
                className="min-h-[44px] min-w-[64px] rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* 従来のサンプル文入力例 */}
        <div className="mt-3">
          <p className="text-[11px] text-slate-400">サンプル作業内容:</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  runSearch(ex);
                }}
                className="min-h-[44px] rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 検索結果サマリー & タブナビ */}
      {searched && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-700">
            「{query}」の類似事故事例:{" "}
            <span className={results.length === 0 ? "text-slate-400" : "text-emerald-600"}>
              {results.length}件
            </span>
          </p>
          <div className="flex gap-1.5">
            <TabButton id="search" activeTab={activeTab} label="事例一覧" onClick={setActiveTab} />
            <TabButton id="score" activeTab={activeTab} label="安全スコア" onClick={setActiveTab} />
            <TabButton id="matrix" activeTab={activeTab} label="リスクマトリクス" onClick={setActiveTab} />
            <TabButton id="trends" activeTab={activeTab} label="傾向分析" onClick={setActiveTab} />
          </div>
        </div>
      )}

      {/* タブコンテンツ */}
      {activeTab === "search" && (
        <div className="space-y-4">
          {/* MHLW 実データから類似事例 TOP5（検索後のみ） */}
          {searched && <MhlwSimilarCasesPanel query={query} />}

          {!searched ? (
            // 未検索時: 傾向分析をデフォルト表示
            <MonthlyTrendsPanel cases={allCases} />
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400">サイト収録 300 件の事故事例には該当が見つかりませんでした（MHLW 実データの結果は上記参照）</p>
              <p className="mt-1 text-xs text-slate-400">別の作業内容や、より具体的なキーワードで試してください</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">
                サイト収録事例（300 件）からの類似結果
              </p>
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                {results.map((c, i) => (
                  <AccidentCard key={c.id} c={c} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "score" && safetyScore && (
        <SafetyScorePanel score={safetyScore} query={query} />
      )}

      {activeTab === "matrix" && (
        <RiskMatrixPanel cases={results} />
      )}

      {activeTab === "trends" && (
        <MonthlyTrendsPanel cases={allCases} />
      )}
    </div>
  );
}
