"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Monitor,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import type { HazardTypeSummary, FeaturedHazardCase } from "@/lib/hazard-slides/build-summary";
import { useWakeLock } from "@/lib/signage/use-wake-lock";
import type { EduDeck, EduSlide } from "@/data/education-decks/types";
import {
  CREDIT_LINE,
  ELEARNING_NOTE,
  FOOTER_DISCLAIMER,
  IMPLEMENTATION_CHECKLIST,
  INSTRUCTOR_NOTE,
  LICENSE_SUMMARY_3,
  POSITIONING_CIRCULAR,
  POSITIONING_SPECIAL,
} from "@/data/education-curriculum/disclaimers";

/**
 * 無償教材デッキ（EduSlideDeck）。既存 HazardSlideDeck の3モード機構（view/present/print）を
 * 教育デッキ（可変枚数・covers 付き）向けに移植した自己完結コンポーネント。
 *  - view: 縦スクロール（スマホ390px対応）
 *  - present: フルスクリーン1枚送り（16:9・キーボード/タップ・URLハッシュ#n・画面消灯防止）
 *  - print: window.print()（A4横・1枚1ページ）
 * 全スライドに線引きフッター（教材提供≠教育実施）を焼き込む（企画01章§3・deliverable #2）。
 */

const STAGE_W = 960;
const STAGE_H = 540;

export type EduDeckMeta = {
  educationClass: "special" | "circular";
  kokuji: string;
  sourceUrl: string;
  retrievedOn: string;
};

type EduSlideDeckProps = {
  deck: EduDeck;
  /** deck.hazardSlugs に対応する統計サマリ（サーバー解決・dataAsOf 付き）。 */
  stats: HazardTypeSummary[];
  meta: EduDeckMeta;
  /** カスタマイズ・出張講習の相談導線（business タブ直行・course 文脈保持）。 */
  contactHref: string;
  /** この教材ページの絶対URL（CTA・出典明記用）。 */
  pageUrl: string;
};

/* ---------- 共通フッター（線引き表示） ---------- */
function SlideFooter() {
  return (
    <p className="mt-auto pt-2 text-[10px] leading-tight text-slate-400">{FOOTER_DISCLAIMER}</p>
  );
}

/* ---------- 各スライド種別 ---------- */

function CoverSlide({ deck, meta, stats }: { deck: EduDeck; meta: EduDeckMeta; stats: HazardTypeSummary[] }) {
  const positioning = meta.educationClass === "special" ? POSITIONING_SPECIAL : POSITIONING_CIRCULAR;
  const asOf = stats[0]?.dataAsOf;
  return (
    <div className="flex h-full flex-col p-6 sm:p-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            無償・申請不要・編集可
          </span>
          {deck.titleEn && <p className="mt-3 text-xs font-semibold tracking-widest text-slate-400">{deck.titleEn}</p>}
          <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">{deck.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{deck.audience}</p>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
        <p className="font-semibold text-slate-800">根拠</p>
        <p className="mt-0.5">{deck.basisDisplay}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          正本: {meta.kokuji}（出典確認 {meta.retrievedOn}）
        </p>
      </div>
      <p className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-2.5 text-[11px] leading-5 text-amber-900">
        {positioning}
      </p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <p className="text-[10px] text-slate-400">{CREDIT_LINE}</p>
        {asOf && <p className="text-[10px] text-slate-400">データ基準日: {asOf.injuries}</p>}
      </div>
    </div>
  );
}

function ContentSlide({ slide }: { slide: EduSlide }) {
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="flex items-baseline gap-2 border-b-4 border-emerald-400 pb-2">
        <h3 className="min-w-0 flex-1 text-base font-bold text-slate-900 sm:text-xl">{slide.title}</h3>
        {slide.titleEn && <span className="shrink-0 text-[10px] font-semibold tracking-widest text-slate-400">{slide.titleEn}</span>}
      </div>
      {slide.lead && <p className="mt-2 text-sm text-slate-600">{slide.lead}</p>}
      {slide.bullets && (
        <ul className="mt-3 space-y-2">
          {slide.bullets.map((b) => (
            <li key={b.head} className="rounded-lg border border-slate-200 bg-white p-2.5">
              <p className="text-sm font-bold text-slate-800">{b.head}</p>
              {b.body && <p className="mt-0.5 text-xs leading-5 text-slate-600">{b.body}</p>}
            </li>
          ))}
        </ul>
      )}
      {slide.table && (
        <table className="mt-3 w-full border-collapse text-xs">
          <thead>
            <tr>
              {slide.table.headers.map((h) => (
                <th key={h} className="border border-slate-300 bg-slate-100 p-1.5 text-left font-bold text-slate-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slide.table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-slate-200 p-1.5 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {slide.note && <p className="mt-2 text-[11px] text-slate-500">※ {slide.note}</p>}
      {slide.covers.length > 0 && (
        <p className="mt-2 text-[10px] text-emerald-700">法定対応: {slide.covers.join(" / ")}</p>
      )}
      <SlideFooter />
    </div>
  );
}

function JitsugiNoticeSlide({ slide }: { slide: EduSlide }) {
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-rose-50 p-3">
        <AlertTriangle aria-hidden="true" className="h-6 w-6 shrink-0 text-rose-600" />
        <h3 className="text-base font-bold text-rose-900 sm:text-lg">{slide.title}</h3>
      </div>
      {slide.lead && <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{slide.lead}</p>}
      {slide.bullets && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {slide.bullets.map((b) => (
            <li key={b.head} className="rounded-lg border border-rose-100 bg-white p-2.5">
              <p className="text-sm font-bold text-slate-800">{b.head}</p>
              {b.body && <p className="mt-0.5 text-xs text-slate-600">{b.body}</p>}
            </li>
          ))}
        </ul>
      )}
      <SlideFooter />
    </div>
  );
}

function StatisticsSlide({ slide, stats }: { slide: EduSlide; stats: HazardTypeSummary[] }) {
  const s = stats[0];
  if (!s) return <ContentSlide slide={slide} />;
  const maxCause = s.topCauses[0]?.count ?? 0;
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="border-b-4 border-sky-400 pb-2">
        <h3 className="text-base font-bold text-slate-900 sm:text-xl">{slide.title}（{s.label}）</h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3">
          <p className="text-[11px] font-semibold text-rose-700">死亡者数</p>
          <p className="mt-0.5 text-4xl font-bold tabular-nums text-rose-700">{s.kpi.deathsTotal.toLocaleString("ja-JP")}<span className="ml-1 text-base">人</span></p>
          {s.kpi.deathsRank && <p className="text-xs font-semibold text-rose-600">全21分類中 第{s.kpi.deathsRank}位</p>}
        </div>
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-3">
          <p className="text-[11px] font-semibold text-sky-700">休業4日以上（{s.kpi.injuriesLatestYear}年）</p>
          <p className="mt-0.5 text-4xl font-bold tabular-nums text-sky-800">{(s.kpi.injuriesLatestCount ?? 0).toLocaleString("ja-JP")}<span className="ml-1 text-base">人</span></p>
        </div>
      </div>
      {s.topCauses.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">起因物 Top5（死亡災害）</p>
          <ol className="mt-2 space-y-1.5">
            {s.topCauses.map((c, i) => (
              <li key={c.name} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">{c.name}</p>
                  <div className="mt-0.5 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-rose-500" style={{ width: `${maxCause ? Math.max(6, (c.count / maxCause) * 100) : 0}%` }} />
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-600">{c.count}件</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="mt-2 text-[10px] text-slate-400">{s.dataAsOf.injuries}／{s.dataAsOf.deaths}。{s.dataAsOf.sourceNote}</p>
      <SlideFooter />
    </div>
  );
}

function CaseCard({ c }: { c: FeaturedHazardCase }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border-2 border-rose-100 bg-rose-50/50 p-3">
      <p className="text-sm font-bold text-slate-900">{c.title}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-700">{c.summary}</p>
      {c.preventionPoints.length > 0 && (
        <p className="mt-1 text-xs text-slate-600"><span className="font-semibold text-emerald-700">防止: </span>{c.preventionPoints.join("／")}</p>
      )}
      <p className="mt-1.5 text-[10px] text-slate-400">
        {c.sourceUrl ? (
          <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">{c.sourceLabel}<ExternalLink aria-hidden="true" className="h-2.5 w-2.5" /></a>
        ) : c.sourceLabel}
        {c.occurredOn ? `（${c.occurredOn}）` : null}
      </p>
    </div>
  );
}

function CasesSlide({ slide, stats }: { slide: EduSlide; stats: HazardTypeSummary[] }) {
  const s = stats[0];
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="border-b-4 border-sky-400 pb-2">
        <h3 className="text-base font-bold text-slate-900 sm:text-xl">{slide.title}</h3>
      </div>
      {!s || s.featuredCases.length === 0 ? (
        <p className="mt-4 flex-1 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">収載事例がまだありません（実在レコードのみ・捏造0原則）。</p>
      ) : (
        <div className="mt-3 flex flex-1 flex-col gap-3 sm:flex-row">
          {s.featuredCases.map((c) => <CaseCard key={c.id} c={c} />)}
        </div>
      )}
      <SlideFooter />
    </div>
  );
}

function QuizSlide({ slide, stats }: { slide: EduSlide; stats: HazardTypeSummary[] }) {
  const q = stats[0]?.quiz?.[0];
  const [selected, setSelected] = useState<number | null>(null);
  if (!q) return <ContentSlide slide={slide} />;
  const answered = selected !== null;
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="border-b-4 border-emerald-400 pb-2">
        <h3 className="text-base font-bold text-slate-900 sm:text-xl">{slide.title}</h3>
      </div>
      <p className="mt-2 text-sm font-bold text-slate-900">{q.question}</p>
      <div className="mt-2 grid flex-1 grid-cols-1 content-start gap-2 sm:grid-cols-2">
        {q.options.map((opt, idx) => {
          const isCorrect = idx === q.correctIndex;
          const isSelected = selected === idx;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setSelected(idx)}
              disabled={answered}
              className={`min-h-[44px] rounded-xl border-2 p-2.5 text-left text-sm font-semibold transition ${
                answered
                  ? isCorrect
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : isSelected
                      ? "border-rose-400 bg-rose-50 text-rose-800"
                      : "border-slate-200 bg-white text-slate-400"
                  : "border-slate-300 bg-white text-slate-800 hover:border-sky-400"
              }`}
            >
              {["A", "B", "C", "D"][idx] ?? idx + 1}. {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-2 rounded-xl border-2 p-2.5 text-xs ${selected === q.correctIndex ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <p className="font-bold">{selected === q.correctIndex ? "正解！" : `正解は「${q.options[q.correctIndex]}」`}</p>
          <p className="mt-1">{q.explanation}</p>
        </div>
      )}
      {/* 印刷時は正解・解説を常時表示 */}
      <div className="mt-2 hidden text-xs print:block">
        <p className="font-bold">正解: {q.options[q.correctIndex]}</p>
        <p>{q.explanation}</p>
      </div>
      <SlideFooter />
    </div>
  );
}

function ChecklistSlide({ slide, meta }: { slide: EduSlide; meta: EduDeckMeta }) {
  // 通達ベース（circular）は実技・修了証の文脈が無いため実技項目を除く
  const items =
    meta.educationClass === "circular"
      ? IMPLEMENTATION_CHECKLIST.filter((t) => !t.includes("実技"))
      : IMPLEMENTATION_CHECKLIST;
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="border-b-4 border-emerald-400 pb-2">
        <h3 className="text-base font-bold text-slate-900 sm:text-xl">{slide.title}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5">
            <span aria-hidden="true" className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border-2 border-emerald-600" />
            <span className="text-xs leading-5 text-slate-800 sm:text-sm">{t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">{INSTRUCTOR_NOTE}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{ELEARNING_NOTE}</p>
      <SlideFooter />
    </div>
  );
}

function TermsSlide({ slide }: { slide: EduSlide }) {
  return (
    <div className="flex h-full flex-col p-4 sm:p-8">
      <div className="border-b-4 border-emerald-400 pb-2">
        <h3 className="text-base font-bold text-slate-900 sm:text-xl">{slide.title}</h3>
      </div>
      <p className="mt-3 text-lg font-bold text-emerald-800">ご自由にお使いください。</p>
      <ul className="mt-2 space-y-1.5">
        {LICENSE_SUMMARY_3.map((t) => (
          <li key={t} className="flex items-start gap-2 text-sm text-slate-700">
            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            {t}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">{CREDIT_LINE}</p>
      <p className="mt-1 text-xs text-slate-500">利用条件の全文は本サイトの教材利用規約ページをご確認ください（/education/pack/terms）。</p>
      <SlideFooter />
    </div>
  );
}

function CtaSlide({ slide, deck, contactHref, pageUrl }: { slide: EduSlide; deck: EduDeck; contactHref: string; pageUrl: string }) {
  return (
    <div className="flex h-full flex-col justify-center p-6 sm:p-10">
      <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">{slide.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        この教材は貴社の現場・機械・事例に合わせてカスタマイズできます。労働安全コンサルタント（登録番号260022）による出張講習・講師派遣も承ります。
      </p>
      <p className="mt-2 text-xs text-slate-500">
        教材の利用は教育の「実施」ではありません。実技・記録・実施は事業者の責任で行ってください。
      </p>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-900">お問い合わせ</p>
        <p className="mt-0.5 break-all text-sm text-amber-800 no-print">
          <Link href={contactHref} className="font-bold underline">カスタマイズ・出張講習を相談する →</Link>
        </p>
        {/* 配布物（印刷・PPTX）向けの短縮URL文字列（QR代替・新規依存回避） */}
        <p className="mt-1 hidden break-all text-[11px] text-amber-800 print:block">{pageUrl}</p>
      </div>
      <p className="mt-4 text-[10px] text-slate-400">{CREDIT_LINE}／{deck.title}</p>
    </div>
  );
}

function SlideBody(props: {
  slide: EduSlide;
  deck: EduDeck;
  stats: HazardTypeSummary[];
  meta: EduDeckMeta;
  contactHref: string;
  pageUrl: string;
}) {
  const { slide, deck, stats, meta, contactHref, pageUrl } = props;
  switch (slide.kind) {
    case "cover":
      return <CoverSlide deck={deck} meta={meta} stats={stats} />;
    case "jitsugi-notice":
      return <JitsugiNoticeSlide slide={slide} />;
    case "statistics":
      return <StatisticsSlide slide={slide} stats={stats} />;
    case "cases":
      return <CasesSlide slide={slide} stats={stats} />;
    case "quiz":
      return <QuizSlide slide={slide} stats={stats} />;
    case "checklist":
      return <ChecklistSlide slide={slide} meta={meta} />;
    case "terms":
      return <TermsSlide slide={slide} />;
    case "cta":
      return <CtaSlide slide={slide} deck={deck} contactHref={contactHref} pageUrl={pageUrl} />;
    default:
      return <ContentSlide slide={slide} />;
  }
}

/* ---------- 投影モード ---------- */

function PresentOverlay(props: {
  deck: EduDeck;
  stats: HazardTypeSummary[];
  meta: EduDeckMeta;
  contactHref: string;
  pageUrl: string;
  initial: number;
  onClose: () => void;
}) {
  const { deck, initial, onClose } = props;
  const count = deck.slides.length;
  const [index, setIndex] = useState(initial);
  const [scale, setScale] = useState(1);
  useWakeLock(true);

  const clamp = useCallback((n: number) => Math.min(count - 1, Math.max(0, n)), [count]);
  const go = useCallback(
    (n: number) => {
      const next = clamp(n);
      setIndex(next);
      window.history.replaceState(null, "", `#${next + 1}`);
    },
    [clamp],
  );

  useEffect(() => {
    const onResize = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H) * 0.96);
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

  const slide = deck.slides[index];
  return (
    <div className="no-print fixed inset-0 z-[80] flex flex-col bg-slate-950" role="dialog" aria-label={`${deck.title} 投影モード`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-xs font-semibold text-slate-300">{deck.title} — {slide.title}（{index + 1}/{count}）</p>
        <button type="button" onClick={onClose} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800">
          <X aria-hidden="true" className="h-4 w-4" />終了
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="overflow-hidden rounded-lg bg-white shadow-2xl" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center" }}>
          <SlideBody slide={slide} deck={deck} stats={props.stats} meta={props.meta} contactHref={props.contactHref} pageUrl={props.pageUrl} />
        </div>
        <button type="button" aria-label="前のスライド" onClick={() => go(index - 1)} className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize" />
        <button type="button" aria-label="次のスライド" onClick={() => go(index + 1)} className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize" />
      </div>
      <div className="flex items-center justify-center gap-3 pb-3">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-slate-100 disabled:opacity-40">
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />前へ
        </button>
        <span className="text-xs text-slate-400 tabular-nums">{index + 1} / {count}</span>
        <button type="button" onClick={() => go(index + 1)} disabled={index === count - 1} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-slate-100 disabled:opacity-40">
          次へ<ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------- 本体 ---------- */

export function EduSlideDeck({ deck, stats, meta, contactHref, pageUrl }: EduSlideDeckProps) {
  const [presentAt, setPresentAt] = useState<number | null>(null);
  const count = deck.slides.length;

  const readHash = () => {
    const n = Number(window.location.hash.replace("#", ""));
    return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0;
  };

  return (
    <div className="edu-slide-deck">
      <div className="no-print sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <button type="button" onClick={() => setPresentAt(readHash())} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700">
          <Monitor aria-hidden="true" className="h-4 w-4" />投影モードで開始
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Printer aria-hidden="true" className="h-4 w-4" />印刷 / PDF（A4横 {count}枚）
        </button>
        <p className="ml-auto hidden text-xs text-slate-500 sm:block">キー・タップで送り／朝礼・雇入れ時教育・特別教育の学科に</p>
      </div>

      <div className="space-y-4">
        {deck.slides.map((slide, i) => (
          <section key={slide.id} aria-label={`スライド${i + 1}: ${slide.title}`} className="edu-slide overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:aspect-[16/9]">
            <SlideBody slide={slide} deck={deck} stats={stats} meta={meta} contactHref={contactHref} pageUrl={pageUrl} />
          </section>
        ))}
      </div>

      {presentAt !== null && (
        <PresentOverlay deck={deck} stats={stats} meta={meta} contactHref={contactHref} pageUrl={pageUrl} initial={presentAt} onClose={() => setPresentAt(null)} />
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .edu-slide-deck .edu-slide {
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
          .edu-slide-deck .edu-slide:last-child { page-break-after: auto; }
        }
        @page { size: A4 landscape; margin: 10mm; }
      `}</style>
    </div>
  );
}
