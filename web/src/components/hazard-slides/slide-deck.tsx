"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Monitor,
  Printer,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HazardGlyphBadge } from "@/components/accidents/accident-type-pictogram";
import type { FeaturedHazardCase, HazardTypeSummary } from "@/lib/hazard-slides/build-summary";
import { useWakeLock } from "@/lib/signage/use-wake-lock";
import type { LearningQuestion } from "@/lib/types/operations";

/**
 * 災害の型別・教育スライド（SlideDeck）。
 *
 * 3モード:
 *  - view: 通常ページ内の縦スクロール（スマホ390px対応）
 *  - present: フルスクリーン1枚送り（16:9固定・キーボード←→/タップ・URLハッシュ#n共有・画面消灯防止）
 *  - print: window.print()（A4横・1型6枚・改ページ固定。LeafletPrintView のパターン）
 *
 * チャートは LazyChart（IntersectionObserver遅延）を使わず即時マウントする。
 * 未表示チャートが白紙印刷になる既知の落とし穴の回避（診断書06 §3.2）。
 */

const SLIDE_TITLES = ["表紙", "統計", "多い原因", "事例", "対策チェック", "確認クイズ"] as const;
export const HAZARD_SLIDE_COUNT = SLIDE_TITLES.length;

/** 16:9 の投影ステージ基準サイズ（px）。transform scale で画面にフィットさせる */
const STAGE_W = 960;
const STAGE_H = 540;

type SlideDeckProps = {
  summary: HazardTypeSummary;
};

/* ---------- 各スライド ---------- */

function CoverSlide({ s, present }: { s: HazardTypeSummary; present: boolean }) {
  const trend = s.kpi.trendPercent;
  return (
    <div className="flex h-full flex-col justify-between p-6 sm:p-10">
      <div className="flex items-center gap-4 sm:gap-6">
        <HazardGlyphBadge glyph={s.glyph} label={s.label} size="xl" className="shadow-sm" />
        <div>
          <p className="text-xs font-semibold tracking-widest text-slate-500">災害の型別 安全教育スライド</p>
          <h2 className={`font-bold text-slate-900 ${present ? "text-6xl" : "text-3xl sm:text-5xl"}`}>{s.label}</h2>
          <p className="mt-1 text-sm text-slate-500">{s.mhlwLabel !== s.label ? `厚労省分類: ${s.mhlwLabel}` : "厚労省「事故の型」分類"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 sm:p-6">
          <p className="text-xs font-semibold text-rose-700">死亡者数（{s.dataAsOf.deaths.replace("死亡災害個票: ", "")}）</p>
          <p className="mt-1 font-bold tabular-nums text-rose-700">
            <span className={present ? "text-7xl" : "text-5xl sm:text-6xl"}>{s.kpi.deathsTotal.toLocaleString("ja-JP")}</span>
            <span className="ml-1 text-xl">人</span>
          </p>
          {s.kpi.deathsRank && (
            <p className="mt-1 text-sm font-semibold text-rose-600">全21分類中 第{s.kpi.deathsRank}位</p>
          )}
        </div>
        <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 sm:p-6">
          <p className="text-xs font-semibold text-sky-700">
            休業4日以上の死傷者数（{s.kpi.injuriesLatestYear}年・確定値）
          </p>
          <p className="mt-1 font-bold tabular-nums text-sky-800">
            <span className={present ? "text-7xl" : "text-5xl sm:text-6xl"}>
              {(s.kpi.injuriesLatestCount ?? 0).toLocaleString("ja-JP")}
            </span>
            <span className="ml-1 text-xl">人</span>
          </p>
          {trend !== null && (
            <p className={`mt-1 text-sm font-semibold ${trend > 0 ? "text-rose-600" : "text-emerald-700"}`}>
              {s.kpi.injuriesFirstYear}年比 {trend > 0 ? `+${trend}%（増加）` : `${trend}%（減少）`}
            </p>
          )}
        </div>
      </div>
      <p className="text-right text-[10px] text-slate-400">{s.dataAsOf.sourceNote}</p>
    </div>
  );
}

function StatsSlide({ s }: { s: HazardTypeSummary }) {
  const trendData = s.yearTrend.map((y) => ({ year: String(y.year), 死傷者数: y.count }));
  const industryData = s.topIndustries.map((i) => ({ name: i.name, 件数: i.count }));
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <SlideHeading s={s} title="統計 — 件数の推移と多い業種" />
      <div className="mt-2 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex min-h-[220px] flex-col rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">休業4日以上 死傷者数の推移（確定値）</p>
          <div className="min-h-[190px] flex-1">
            <ResponsiveContainer width="100%" height="100%" minHeight={190}>
              <LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} width={44} />
                <Tooltip />
                <Line type="monotone" dataKey="死傷者数" stroke="#0284c7" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex min-h-[220px] flex-col rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">死傷者数の多い業種 Top5（2006〜2021年合算）</p>
          <div className="min-h-[190px] flex-1">
            <ResponsiveContainer width="100%" height="100%" minHeight={190}>
              <BarChart data={industryData} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={86} />
                <Tooltip />
                <Bar dataKey="件数" fill="#f59e0b" radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <DataFooter s={s} />
    </div>
  );
}

function CausesSlide({ s }: { s: HazardTypeSummary }) {
  const maxCause = s.topCauses[0]?.count ?? 0;
  const maxTime = Math.max(1, ...s.timeDistribution.map((t) => t.count));
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <SlideHeading s={s} title="多い原因 — 起因物と発生時間帯" />
      <div className="mt-2 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">起因物 Top5（死亡災害 {s.dataAsOf.deaths.replace("死亡災害個票: ", "")}）</p>
          {s.topCauses.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">この型の死亡個票の収載はありません。</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {s.topCauses.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                    <div className="mt-0.5 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-rose-500"
                        style={{ width: `${maxCause ? Math.max(6, (c.count / maxCause) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-slate-600">{c.count}件</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">発生時間帯の分布（死亡災害）</p>
          {s.timeDistribution.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">この型の時間帯データの収載はありません。</p>
          ) : (
            <div className="mt-2 flex h-[200px] items-end gap-1">
              {s.timeDistribution.map((t) => (
                <div key={t.name} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${t.name}: ${t.count}件`}>
                  <span className="text-[9px] tabular-nums text-slate-500">{t.count}</span>
                  <div className="w-full rounded-t bg-amber-400" style={{ height: `${(t.count / maxTime) * 160}px` }} />
                  <span className="w-full truncate text-center text-[8px] text-slate-500">{t.name.replace(/時台?/g, "")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <DataFooter s={s} />
    </div>
  );
}

function CaseCard({ c }: { c: FeaturedHazardCase }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border-2 border-rose-100 bg-rose-50/50 p-3 sm:p-4">
      <p className="text-sm font-bold text-slate-900">{c.title}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-700 sm:text-sm">{c.summary}</p>
      {c.mainCauses.length > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          <span className="font-semibold text-rose-700">主な原因: </span>
          {c.mainCauses.join("／")}
        </p>
      )}
      {c.preventionPoints.length > 0 && (
        <p className="mt-1 text-xs text-slate-600">
          <span className="font-semibold text-emerald-700">防止のポイント: </span>
          {c.preventionPoints.join("／")}
        </p>
      )}
      <p className="mt-2 text-[10px] text-slate-400">
        {c.sourceUrl ? (
          <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline decoration-slate-300 hover:text-slate-600">
            {c.sourceLabel}
            <ExternalLink aria-hidden="true" className="h-2.5 w-2.5" />
          </a>
        ) : (
          c.sourceLabel
        )}
        {c.occurredOn ? `（${c.occurredOn}）` : null}
      </p>
    </div>
  );
}

function CasesSlide({ s }: { s: HazardTypeSummary }) {
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <SlideHeading s={s} title="実際に起きた災害" />
      {s.featuredCases.length === 0 ? (
        <div className="mt-4 flex-1 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
          この型の収載事例はまだありません（死亡災害データベース・収載事例DBとも該当なし）。
          発生が少ない型でも、対策チェック（次のスライド）は他の型と同様に確認してください。
        </div>
      ) : (
        <div className="mt-3 flex flex-1 flex-col gap-3 sm:flex-row">
          {s.featuredCases.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
      <DataFooter s={s} />
    </div>
  );
}

function MeasuresSlide({ s }: { s: HazardTypeSummary }) {
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <SlideHeading s={s} title="対策チェックリスト" />
      <p className="mt-1 text-xs font-semibold text-emerald-800 sm:text-sm">{s.measures.headline}</p>
      <ul className="mt-3 flex-1 space-y-2">
        {s.measures.checklist.map((item) => (
          <li key={item.text} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5">
            <span aria-hidden="true" className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border-2 border-emerald-600" />
            <span className="min-w-0 text-xs leading-relaxed text-slate-800 sm:text-sm">
              {item.text}
              {item.lawLabel && (
                <>
                  {" "}
                  {item.lawHref ? (
                    <Link href={item.lawHref} className="whitespace-nowrap text-emerald-700 underline decoration-emerald-300 hover:text-emerald-900">
                      （{item.lawLabel}）
                    </Link>
                  ) : (
                    <span className="whitespace-nowrap text-slate-500">（{item.lawLabel}）</span>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-slate-400">条文リンクは当サイト法令ナビ（e-Gov法令データ準拠）に着地します。</p>
    </div>
  );
}

function QuizSlide({ s, question }: { s: HazardTypeSummary; question: LearningQuestion }) {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <SlideHeading s={s} title="確認クイズ" />
      <p className="mt-2 text-sm font-bold text-slate-900 sm:text-base">{question.question}</p>
      <div className="mt-3 grid flex-1 grid-cols-1 content-start gap-2 sm:grid-cols-2">
        {question.options.map((opt, idx) => {
          const isCorrect = idx === question.correctIndex;
          const isSelected = selected === idx;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setSelected(idx)}
              disabled={answered}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border-2 p-3 text-left text-sm font-semibold transition ${
                answered
                  ? isCorrect
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : isSelected
                      ? "border-rose-400 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-white text-slate-400"
                  : "border-slate-300 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                {["A", "B", "C", "D"][idx] ?? idx + 1}
              </span>
              <span className="min-w-0 flex-1">{opt}</span>
              {answered && isCorrect && <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600" />}
              {answered && isSelected && !isCorrect && <XCircle aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-500" />}
            </button>
          );
        })}
      </div>
      <p className="no-print mt-1 text-xs">
        <Link
          href="/e-learning?theme=el-hazard-types#el-quiz"
          className="text-sky-700 underline decoration-sky-300 hover:text-sky-900"
        >
          Eラーニングで続きの問題を解く →
        </Link>
      </p>
      {answered ? (
        <div
          className={`mt-2 rounded-xl border-2 p-3 text-xs leading-relaxed sm:text-sm ${
            selected === question.correctIndex
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-amber-300 bg-amber-50 text-amber-950"
          }`}
        >
          <p className="font-bold">
            {selected === question.correctIndex ? "正解！" : `残念。正解は「${question.options[question.correctIndex]}」`}
          </p>
          <p className="mt-1">{question.explanation}</p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500 no-print">答えをタップすると解説が出ます。印刷時は解説も印字されます。</p>
      )}
      {/* 印刷時のみ解説を常時表示（タップできないため） */}
      {!answered && (
        <div className="hidden print:block mt-2 rounded-xl border border-slate-300 p-3 text-xs leading-relaxed">
          <p className="font-bold">正解: {question.options[question.correctIndex]}</p>
          <p className="mt-1">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function SlideHeading({ s, title }: { s: HazardTypeSummary; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b-4 border-amber-400 pb-2">
      <HazardGlyphBadge glyph={s.glyph} label={s.label} size="md" />
      <h3 className="min-w-0 flex-1 truncate text-base font-bold text-slate-900 sm:text-xl">
        {s.label} <span className="text-slate-400">—</span> {title}
      </h3>
    </div>
  );
}

function DataFooter({ s }: { s: HazardTypeSummary }) {
  return (
    <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
      {s.dataAsOf.injuries}／{s.dataAsOf.deaths}
      {s.dataAsOf.preliminary ? `／${s.dataAsOf.preliminary}` : ""}。{s.dataAsOf.sourceNote}
    </p>
  );
}

function SlideBody({ s, index, present }: { s: HazardTypeSummary; index: number; present: boolean }) {
  switch (index) {
    case 0:
      return <CoverSlide s={s} present={present} />;
    case 1:
      return <StatsSlide s={s} />;
    case 2:
      return <CausesSlide s={s} />;
    case 3:
      return <CasesSlide s={s} />;
    case 4:
      return <MeasuresSlide s={s} />;
    default:
      return <QuizSlide s={s} question={s.quiz[0]} />;
  }
}

/* ---------- 投影モード ---------- */

function PresentOverlay({ s, initial, onClose }: { s: HazardTypeSummary; initial: number; onClose: () => void }) {
  const [index, setIndex] = useState(initial);
  const [scale, setScale] = useState(1);
  useWakeLock(true);

  const clamp = useCallback((n: number) => Math.min(HAZARD_SLIDE_COUNT - 1, Math.max(0, n)), []);
  const go = useCallback(
    (n: number) => {
      const next = clamp(n);
      setIndex(next);
      // URLハッシュでページ共有（#1〜#6）
      window.history.replaceState(null, "", `#${next + 1}`);
    },
    [clamp],
  );

  useEffect(() => {
    const onResize = () => {
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H) * 0.96);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  return (
    <div className="no-print fixed inset-0 z-[80] flex flex-col bg-slate-950" role="dialog" aria-label={`${s.label} 投影モード`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-xs font-semibold text-slate-300">
          {s.label} — {SLIDE_TITLES[index]}（{index + 1}/{HAZARD_SLIDE_COUNT}）
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          終了
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div
          className="overflow-hidden rounded-lg bg-white shadow-2xl"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center" }}
        >
          <SlideBody s={s} index={index} present />
        </div>
        {/* タップ送り（左右半分） */}
        <button
          type="button"
          aria-label="前のスライド"
          onClick={() => go(index - 1)}
          className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize"
        />
        <button
          type="button"
          aria-label="次のスライド"
          onClick={() => go(index + 1)}
          className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize"
        />
      </div>
      <div className="flex items-center justify-center gap-3 pb-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-slate-100 disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          前へ
        </button>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {SLIDE_TITLES.map((t, i) => (
            <span key={t} className={`h-2 w-2 rounded-full ${i === index ? "bg-amber-400" : "bg-slate-700"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === HAZARD_SLIDE_COUNT - 1}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-slate-100 disabled:opacity-40"
        >
          次へ
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- 本体 ---------- */

export function HazardSlideDeck({ summary }: SlideDeckProps) {
  const [presentAt, setPresentAt] = useState<number | null>(null);

  // 深リンク: #3 のようなハッシュ付きで開いた場合、その枚から投影を開始する
  const readHash = () => {
    const n = Number(window.location.hash.replace("#", ""));
    return Number.isInteger(n) && n >= 1 && n <= HAZARD_SLIDE_COUNT ? n - 1 : 0;
  };

  return (
    <div className="hazard-slide-deck">
      {/* ツールバー（画面のみ） */}
      <div className="no-print sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => setPresentAt(readHash())}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700"
        >
          <Monitor aria-hidden="true" className="h-4 w-4" />
          投影モードで開始
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Printer aria-hidden="true" className="h-4 w-4" />
          印刷 / PDF（A4横 6枚）
        </button>
        <p className="ml-auto hidden text-xs text-slate-500 sm:block">
          <ArrowLeft aria-hidden="true" className="mr-0.5 inline h-3 w-3" />
          <ArrowRight aria-hidden="true" className="mr-1 inline h-3 w-3" />
          キー・タップで送り／朝礼・雇入れ時教育・職長教育に
        </p>
      </div>

      {/* view モード: 縦に6枚 */}
      <div className="space-y-4">
        {SLIDE_TITLES.map((title, i) => (
          <section
            key={title}
            aria-label={`スライド${i + 1}: ${title}`}
            className="hazard-slide overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:aspect-[16/9]"
          >
            <SlideBody s={summary} index={i} present={false} />
          </section>
        ))}
      </div>

      {presentAt !== null && (
        <PresentOverlay s={summary} initial={presentAt} onClose={() => setPresentAt(null)} />
      )}

      {/* 印刷: A4横・1枚1ページ（LeafletPrintView の確立パターンを16:9系に移植） */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .hazard-slide-deck .hazard-slide {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
            page-break-after: always;
            page-break-inside: avoid;
            width: 100%;
            height: 186mm;
            overflow: hidden;
            aspect-ratio: auto !important;
          }
          .hazard-slide-deck .hazard-slide:last-child { page-break-after: auto; }
          .hazard-slide-deck .recharts-wrapper { page-break-inside: avoid; }
        }
        @page { size: A4 landscape; margin: 10mm; }
      `}</style>
    </div>
  );
}
