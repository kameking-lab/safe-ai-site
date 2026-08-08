"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  BellRing,
  BookOpenCheck,
  ClipboardCheck,
  Droplets,
  ExternalLink,
  Fan,
  Gauge,
  HeartPulse,
  ListChecks,
  Maximize2,
  MessageCircleMore,
  PhoneCall,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Snowflake,
  Sun,
  ThermometerSun,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  getHeatLearningSource,
  HEAT_LEARNING_SOURCES,
} from "@/data/heat-illness-learning/sources";
import { HEAT_ILLNESS_FIELD_BRIEFING } from "@/data/heat-illness-learning/slides";
import type {
  HeatLearningClaimKind,
  HeatLearningSlide,
} from "@/data/heat-illness-learning/types";

const CLAIM_KIND_LABELS: Record<HeatLearningClaimKind, string> = {
  "statutory-duty": "法令上の義務",
  "statutory-scope": "法令の対象目安",
  "guideline-recommendation": "2026年指針の推奨",
  "official-observation": "公式観測情報の説明",
  "official-emergency-guidance": "公式の緊急対応",
  "portal-explanation": "サイト独自の整理",
};

const CLAIM_KIND_CLASSES: Record<HeatLearningClaimKind, string> = {
  "statutory-duty":
    "border-rose-700 bg-rose-50 text-rose-950 dark:border-rose-300 dark:bg-rose-950/50 dark:text-rose-50",
  "statutory-scope":
    "border-orange-700 bg-orange-50 text-orange-950 dark:border-orange-300 dark:bg-orange-950/50 dark:text-orange-50",
  "guideline-recommendation":
    "border-amber-700 bg-amber-50 text-amber-950 dark:border-amber-300 dark:bg-amber-950/50 dark:text-amber-50",
  "official-observation":
    "border-sky-700 bg-sky-50 text-sky-950 dark:border-sky-300 dark:bg-sky-950/50 dark:text-sky-50",
  "official-emergency-guidance":
    "border-red-800 bg-red-50 text-red-950 dark:border-red-300 dark:bg-red-950/50 dark:text-red-50",
  "portal-explanation":
    "border-slate-700 bg-slate-50 text-slate-950 dark:border-slate-300 dark:bg-slate-900 dark:text-slate-50",
};

type SlideTheme = {
  icon: LucideIcon;
  accent: string;
  surface: string;
  stage: string;
  kicker: string;
  layout: "split" | "reverse" | "poster" | "emergency";
};

const SLIDE_THEMES: Record<string, SlideTheme> = {
  "what-is-heat-illness": {
    icon: ThermometerSun,
    accent: "bg-orange-700 text-white",
    surface: "from-orange-100 via-amber-50 to-white dark:from-orange-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-orange-500 bg-orange-950 text-white",
    kicker: "身体 × 暑熱環境",
    layout: "poster",
  },
  "risk-conditions": {
    icon: Gauge,
    accent: "bg-rose-700 text-white",
    surface: "from-rose-100 via-orange-50 to-white dark:from-rose-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-rose-500 bg-rose-950 text-white",
    kicker: "今日のリスクを重ねて見る",
    layout: "reverse",
  },
  "wbgt-provenance": {
    icon: Gauge,
    accent: "bg-sky-700 text-white",
    surface: "from-sky-100 via-cyan-50 to-white dark:from-sky-950/70 dark:via-slate-950 dark:to-slate-950",
    stage: "border-sky-400 bg-sky-950 text-white",
    kicker: "値だけでなく出どころを見る",
    layout: "split",
  },
  "before-work": {
    icon: ClipboardCheck,
    accent: "bg-emerald-700 text-white",
    surface: "from-emerald-100 via-teal-50 to-white dark:from-emerald-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-emerald-400 bg-emerald-950 text-white",
    kicker: "作業前の6ポイント",
    layout: "poster",
  },
  "hydration-rest": {
    icon: Droplets,
    accent: "bg-blue-700 text-white",
    surface: "from-blue-100 via-cyan-50 to-white dark:from-blue-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-cyan-400 bg-blue-950 text-white",
    kicker: "飲むだけで終わらせない",
    layout: "split",
  },
  acclimatization: {
    icon: BatteryCharging,
    accent: "bg-lime-700 text-white",
    surface: "from-lime-100 via-emerald-50 to-white dark:from-lime-950/50 dark:via-slate-950 dark:to-slate-950",
    stage: "border-lime-400 bg-emerald-950 text-white",
    kicker: "段階的に負荷を調整",
    layout: "reverse",
  },
  "warning-signs": {
    icon: HeartPulse,
    accent: "bg-fuchsia-700 text-white",
    surface: "from-fuchsia-100 via-rose-50 to-white dark:from-fuchsia-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-fuchsia-400 bg-fuchsia-950 text-white",
    kicker: "いつもと違うを見逃さない",
    layout: "poster",
  },
  "buddy-check": {
    icon: MessageCircleMore,
    accent: "bg-violet-700 text-white",
    surface: "from-violet-100 via-indigo-50 to-white dark:from-violet-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-violet-400 bg-violet-950 text-white",
    kicker: "一人にしない声かけ",
    layout: "reverse",
  },
  "emergency-response": {
    icon: Siren,
    accent: "bg-red-700 text-white",
    surface: "from-red-100 via-orange-50 to-white dark:from-red-950/70 dark:via-slate-950 dark:to-slate-950",
    stage: "border-red-400 bg-red-950 text-white",
    kicker: "迷ったら対応を遅らせない",
    layout: "emergency",
  },
  "call-119-and-aed": {
    icon: PhoneCall,
    accent: "bg-red-800 text-white",
    surface: "from-red-100 via-rose-50 to-white dark:from-red-950/70 dark:via-slate-950 dark:to-slate-950",
    stage: "border-red-400 bg-slate-950 text-white",
    kicker: "通報・AED・応急手当",
    layout: "emergency",
  },
  "work-plan": {
    icon: ShieldCheck,
    accent: "bg-emerald-800 text-white",
    surface: "from-emerald-100 via-amber-50 to-white dark:from-emerald-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-emerald-400 bg-slate-950 text-white",
    kicker: "対策は上位から組み合わせる",
    layout: "poster",
  },
  "ky-check": {
    icon: ListChecks,
    accent: "bg-amber-700 text-white",
    surface: "from-amber-100 via-yellow-50 to-white dark:from-amber-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-yellow-400 bg-amber-950 text-white",
    kicker: "開始前チェックリスト",
    layout: "split",
  },
  "manager-check": {
    icon: UserCheck,
    accent: "bg-indigo-800 text-white",
    surface: "from-indigo-100 via-blue-50 to-white dark:from-indigo-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-indigo-400 bg-indigo-950 text-white",
    kicker: "体制と手順を確認",
    layout: "reverse",
  },
  "summary-quiz": {
    icon: BookOpenCheck,
    accent: "bg-teal-700 text-white",
    surface: "from-teal-100 via-cyan-50 to-white dark:from-teal-950/60 dark:via-slate-950 dark:to-slate-950",
    stage: "border-teal-400 bg-teal-950 text-white",
    kicker: "今日から変える4アクション",
    layout: "poster",
  },
};

function getTheme(slide: HeatLearningSlide): SlideTheme {
  return SLIDE_THEMES[slide.id] ?? SLIDE_THEMES["what-is-heat-illness"];
}

function SourceLinks({ sourceIds }: { sourceIds: readonly string[] }) {
  return (
    <ul className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs [overflow-wrap:anywhere]">
      {sourceIds.map((sourceId) => {
        const source = getHeatLearningSource(sourceId);
        if (!source) {
          return (
            <li
              key={sourceId}
              className="font-bold text-red-800 forced-colors:text-[CanvasText]"
            >
              出典レコード未解決: {sourceId}
            </li>
          );
        }
        return (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] max-w-full min-w-0 flex-wrap items-center gap-1 py-2 font-bold text-sky-900 underline decoration-2 underline-offset-4 transition-colors [overflow-wrap:anywhere] hover:text-sky-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 motion-reduce:transition-none dark:text-sky-200 forced-colors:text-[LinkText] forced-colors:outline forced-colors:outline-1"
            >
              {source.documentNumber
                ? `${source.documentNumber}（公式）`
                : `${source.issuer}公式`}
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ControlHierarchyVisual() {
  const controls = [
    ["1", "本質的対策", "作業そのもの・時間帯・方法を変える", Sun],
    ["2", "工学的対策", "遮熱・送風・冷房・熱源隔離", Fan],
    ["3", "管理的対策", "休憩・交代・監視・連絡手順", Users],
    ["4", "PPE・補助用品", "上位対策と併用する最後の砦", ShieldCheck],
  ] as const;
  return (
    <ol className="grid gap-2">
      {controls.map(([number, title, text, Icon], index) => (
        <li
          key={title}
          className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 p-3"
          style={{ marginInline: `${index * 0.55}rem` }}
        >
          <span className="portal-light-ink flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-300 font-black text-slate-950">
            {number}
          </span>
          <Icon className="h-6 w-6 shrink-0 text-cyan-200" aria-hidden="true" />
          <span>
            <strong className="block text-base">{title}</strong>
            <span className="text-xs leading-5 text-slate-200">{text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function SlideVisual({ slide }: { slide: HeatLearningSlide }) {
  const theme = getTheme(slide);
  const Icon = theme.icon;

  if (slide.id === "work-plan") return <ControlHierarchyVisual />;

  if (slide.id === "wbgt-provenance") {
    return (
      <div className="grid gap-3">
        <div className="portal-light-ink flex items-end justify-between rounded-2xl bg-cyan-300 p-4 text-slate-950">
          <span>
            <span className="block text-xs font-black tracking-widest">暑さ指数</span>
            <span className="text-5xl font-black tracking-tighter">WBGT</span>
          </span>
          <Gauge className="h-16 w-16" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
          {["実測", "実況推定", "予測"].map((label, index) => (
            <span
              key={label}
              className="rounded-xl border border-white/30 bg-white/10 px-2 py-3"
            >
              <span className="mb-1 block text-lg text-cyan-200">{index + 1}</span>
              {label}
            </span>
          ))}
        </div>
        <p className="text-center text-xs font-bold text-cyan-100">
          地点・対象時刻・取得時刻・提供元まで確認
        </p>
      </div>
    );
  }

  if (slide.id === "hydration-rest") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Droplets className="h-16 w-16 text-cyan-300" aria-hidden="true" />
          <span className="text-5xl font-black">＋</span>
          <Snowflake className="h-16 w-16 text-sky-200" aria-hidden="true" />
          <span className="text-5xl font-black">＋</span>
          <ShieldCheck className="h-16 w-16 text-yellow-300" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
          {["補給", "冷却・休憩", "作業の見直し"].map((label) => (
            <span key={label} className="rounded-xl bg-white/10 p-3">
              {label}
            </span>
          ))}
        </div>
        <p className="rounded-xl border border-cyan-300/60 bg-cyan-300/10 p-3 text-center font-black text-cyan-100">
          「こまめに」を時刻・場所・担当へ
        </p>
      </div>
    );
  }

  if (slide.id === "buddy-check") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[2rem_2rem_2rem_.5rem] bg-white p-5 text-slate-950">
          <p className="text-2xl font-black">いつもと違う？</p>
          <p className="mt-2 text-sm">返事・様子・作業の変化を確認</p>
        </div>
        <div className="portal-light-ink rounded-[2rem_2rem_.5rem_2rem] bg-yellow-300 p-5 text-slate-950 sm:mt-12">
          <p className="text-2xl font-black">一緒に止めよう</p>
          <p className="mt-2 text-sm">一人にせず、報告先へつなぐ</p>
        </div>
      </div>
    );
  }

  if (
    slide.id === "emergency-response" ||
    slide.id === "call-119-and-aed"
  ) {
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="rounded-2xl bg-white p-4 text-center text-2xl font-black text-red-950">
            作業停止
          </span>
          <ArrowRight className="h-8 w-8" aria-hidden="true" />
          <span className="portal-light-ink rounded-2xl bg-yellow-300 p-4 text-center text-3xl font-black text-slate-950">
            119
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <span className="rounded-2xl border border-white/30 bg-white/10 p-4 text-center font-black">
            一人にしない
          </span>
          <span className="rounded-2xl border border-white/30 bg-white/10 p-4 text-center font-black">
            通報を遅らせない
          </span>
        </div>
        <div className="flex items-center justify-center gap-5 rounded-2xl border-2 border-red-300 p-4">
          <PhoneCall className="h-10 w-10" aria-hidden="true" />
          <span className="text-xl font-black">AED・応急手当は指示に従う</span>
        </div>
      </div>
    );
  }

  if (slide.id === "ky-check" || slide.id === "before-work") {
    const items =
      slide.id === "before-work"
        ? ["気象・WBGT", "作業負荷", "日射・熱源", "休憩・冷却", "体調・服装", "報告・救急"]
        : ["地域・日付", "作業内容", "時間・休憩", "補給場所", "体調確認", "役割分担"];
    return (
      <ul className="grid grid-cols-2 gap-2">
        {items.map((item, index) => (
          <li
            key={item}
            className="flex min-h-16 items-center gap-2 rounded-xl border border-white/25 bg-white/10 p-3 text-sm font-black"
          >
            <span className="portal-light-ink flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-300 text-slate-950">
              {index + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (slide.id === "manager-check") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["報告体制", "異常を見つけたら、誰へどう報告するか"],
          ["対応手順", "離脱・冷却・救急要請へどうつなぐか"],
        ].map(([title, text], index) => (
          <div
            key={title}
            className="rounded-2xl border-2 border-indigo-300 bg-white/10 p-5"
          >
            <span className="text-5xl font-black text-indigo-200">0{index + 1}</span>
            <p className="mt-3 text-xl font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-indigo-100">{text}</p>
          </div>
        ))}
      </div>
    );
  }

  if (slide.id === "summary-quiz") {
    return (
      <div className="grid gap-3">
        {["測る", "変える", "声をかける", "迷わずつなぐ"].map((label, index) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-white/25 bg-white/10 p-3"
          >
            <BadgeCheck className="h-8 w-8 text-yellow-300" aria-hidden="true" />
            <span className="text-2xl font-black">{label}</span>
            <span className="ml-auto text-sm font-black text-teal-200">0{index + 1}</span>
          </div>
        ))}
      </div>
    );
  }

  const orbitLabels: Record<string, string[]> = {
    "what-is-heat-illness": ["環境", "作業", "身体"],
    "risk-conditions": ["気象", "熱源", "負荷", "服装", "体調"],
    acclimatization: ["負荷を調整", "様子を見る", "計画を見直す"],
    "warning-signs": ["返事", "動き", "顔色", "訴え"],
  };
  const labels = orbitLabels[slide.id] ?? ["確認", "共有", "行動"];

  return (
    <div className="relative mx-auto flex min-h-72 max-w-lg items-center justify-center">
      <div className="absolute inset-6 rounded-full border border-dashed border-white/40 motion-safe:animate-[spin_30s_linear_infinite] motion-reduce:animate-none" />
      <div className="portal-light-ink relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-yellow-300 text-slate-950 shadow-[0_0_0_14px_rgba(255,255,255,.08)]">
        <Icon className="h-16 w-16" aria-hidden="true" />
      </div>
      {labels.map((label, index) => {
        const positions = [
          "left-2 top-6",
          "right-1 top-16",
          "bottom-4 left-10",
          "bottom-2 right-8",
          "left-0 top-1/2",
        ];
        return (
          <span
            key={label}
            className={`absolute rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs font-black backdrop-blur-sm ${positions[index]}`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function ProjectionStage({
  index,
  onIndexChange,
  onClose,
}: {
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const slides = HEAT_ILLNESS_FIELD_BRIEFING.slides;
  const slide = index >= 0 ? slides[index] : null;
  const total = slides.length + 1;
  const position = index + 2;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current
      ?.querySelector<HTMLButtonElement>("[data-projection-close]")
      ?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < slides.length - 1) {
        onIndexChange(index + 1);
      }
      if (event.key === "ArrowLeft" && index > -1) {
        onIndexChange(index - 1);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not(:disabled), a[href]",
          ),
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, [index, onClose, onIndexChange, slides.length]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="熱中症ブリーフィング投影モード"
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950 text-white print:hidden"
    >
      <div className="sticky top-0 z-20 flex min-h-16 items-center gap-2 border-b border-white/20 bg-slate-950/95 px-3 py-2 backdrop-blur sm:px-6">
        <p className="mr-auto text-sm font-black">
          投影モード <span className="text-cyan-300">{position} / {total}</span>
        </p>
        <button
          type="button"
          onClick={() => onIndexChange(index - 1)}
          disabled={index <= -1}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300"
          aria-label="前のスライド"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onIndexChange(index + 1)}
          disabled={index >= slides.length - 1}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/40 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300"
          aria-label="次のスライド"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          data-projection-close
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 py-2 font-black text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300"
        >
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">閉じる</span>
        </button>
      </div>

      {slide ? (
        <article className={`min-h-[calc(100svh-4rem)] bg-gradient-to-br ${getTheme(slide).surface}`}>
          <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1600px] gap-6 p-5 lg:grid-cols-[minmax(320px,.85fr)_minmax(0,1.15fr)] lg:items-center lg:p-10">
            <section className={`rounded-[2rem] border-2 p-5 shadow-2xl lg:p-8 ${getTheme(slide).stage}`}>
              <p className="text-sm font-black tracking-[.18em] text-yellow-300">{getTheme(slide).kicker}</p>
              <div className="mt-6">
                <SlideVisual slide={slide} />
              </div>
            </section>
            <section className="text-slate-950 dark:text-white">
              <p className="text-sm font-black tracking-[.18em] text-orange-700 dark:text-orange-200">
                {slide.eyebrow} · SLIDE {String(slide.number).padStart(2, "0")}
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">{slide.title}</h2>
              <p className="mt-4 text-lg font-bold leading-8 sm:text-2xl">{slide.lead}</p>
              <ul className="mt-6 space-y-3">
                {slide.claims.map((claim) => (
                  <li key={claim.id} className="rounded-2xl border-2 border-slate-700 bg-white/90 p-4 text-base font-semibold leading-7 text-slate-950 sm:text-lg">
                    {claim.text}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl bg-emerald-800 p-5 text-white">
                <p className="text-xs font-black tracking-widest text-emerald-100">今日の確認</p>
                <p className="mt-2 text-lg font-black leading-8">{slide.fieldAction}</p>
              </div>
            </section>
          </div>
        </article>
      ) : (
        <article className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-slate-950">
          <Image
            src="/visual-refresh/heat-field-briefing-hero.webp"
            alt="日陰の休憩所でWBGT、水分、作業計画を確認する現場チームのイラスト"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/10" />
          <div className="relative z-10 flex min-h-[calc(100svh-4rem)] max-w-5xl flex-col justify-center p-6 sm:p-12 lg:p-20">
            <p className="font-black tracking-[.2em] text-yellow-300">2026 SUMMER FIELD BRIEFING</p>
            <h2 className="mt-5 text-5xl font-black leading-[1.05] sm:text-7xl">
              熱中症を防ぐ
              <span className="block text-cyan-300">現場ブリーフィング</span>
            </h2>
            <p className="mt-6 max-w-2xl text-xl font-bold leading-9 text-slate-100">
              測る。変える。声をかける。迷わずつなぐ。
            </p>
            <p className="mt-8 inline-flex w-fit rounded-full border border-white/40 bg-slate-950/60 px-4 py-2 text-sm font-black">
              表紙 · 次へ進むと14枚の教材が始まります
            </p>
          </div>
        </article>
      )}
    </div>
  );
}

export function HeatIllnessSlides() {
  const [projectionIndex, setProjectionIndex] = useState<number | null>(null);

  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      {projectionIndex !== null ? (
        <ProjectionStage
          index={projectionIndex}
          onIndexChange={setProjectionIndex}
          onClose={() => setProjectionIndex(null)}
        />
      ) : null}

      <div className="mb-5 grid gap-3 rounded-3xl border-2 border-slate-800 bg-slate-950 p-4 text-white shadow-xl sm:grid-cols-[1fr_auto] sm:items-center dark:border-slate-100 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
        <div>
          <p className="font-black">朝礼・投影・印刷、3つの見方</p>
          <p className="mt-1 text-sm leading-6 text-slate-200 forced-colors:text-[CanvasText]">
            HTML正本は全14枚を常時表示。投影モードでは1枚ずつ大きく、印刷時は横向き資料として改ページします。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setProjectionIndex(-1)}
            className="portal-light-ink inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 font-black text-slate-950 transition-colors hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300 motion-reduce:transition-none forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]"
          >
            <Maximize2 className="h-5 w-5" aria-hidden="true" />
            投影モード
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border-2 border-white bg-slate-950 px-4 py-2 font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-400 motion-reduce:transition-none print:hidden forced-colors:border-[ButtonText] forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]"
          >
            <Printer className="h-5 w-5" aria-hidden="true" />
            スライドを印刷
          </button>
        </div>
      </div>

      <article className="relative mb-6 min-h-[420px] overflow-hidden rounded-[2rem] border-2 border-slate-800 bg-slate-950 shadow-2xl print:min-h-[180mm] print:break-after-page print:rounded-none print:shadow-none forced-colors:border-[CanvasText]">
        <Image
          src="/visual-refresh/heat-field-briefing-hero.webp"
          alt="日陰の休憩所でWBGT、水分、作業計画を確認する現場チームのイラスト"
          fill
          sizes="(max-width: 768px) 100vw, 1280px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/10 print:bg-slate-950/70" />
        <div className="relative z-10 flex min-h-[420px] max-w-3xl flex-col justify-end p-6 text-white sm:p-10">
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="portal-light-ink rounded-full bg-orange-500 px-3 py-1.5 text-slate-950">2026 夏</span>
            <span className="rounded-full border border-white/50 bg-slate-950/60 px-3 py-1.5">朝礼 5〜10分</span>
            <span className="rounded-full border border-white/50 bg-slate-950/60 px-3 py-1.5">全14枚＋表紙</span>
          </div>
          <p className="mt-5 font-black tracking-[.2em] text-yellow-300">FIELD BRIEFING</p>
          <h2 className="mt-2 text-4xl font-black leading-[1.05] sm:text-6xl">
            熱中症を防ぐ
            <span className="block text-cyan-300">現場ブリーフィング</span>
          </h2>
          <p className="mt-5 text-lg font-bold leading-8 text-slate-100">
            測る。変える。声をかける。迷わずつなぐ。
          </p>
        </div>
      </article>

      <nav
        aria-label="スライド内目次"
        className="mb-8 overflow-hidden rounded-3xl border-2 border-slate-300 bg-white p-4 print:hidden dark:border-slate-600 dark:bg-slate-950 forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-black tracking-widest text-orange-700 dark:text-orange-200">STORY MAP</p>
            <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">今日の行動へつなぐ14シーン</p>
          </div>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">カードを選ぶと該当スライドへ移動</p>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {HEAT_ILLNESS_FIELD_BRIEFING.slides.map((slide) => {
            const theme = getTheme(slide);
            const Icon = theme.icon;
            return (
              <li key={slide.id}>
                <a
                  href={`#slide-${slide.id}`}
                  aria-label={`${slide.number}. ${slide.title}`}
                  className="group flex min-h-[44px] min-w-0 items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-2 text-sm font-black text-slate-900 transition-[transform,border-color,box-shadow] [overflow-wrap:anywhere] hover:-translate-y-0.5 hover:border-orange-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300 motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 dark:text-white forced-colors:border-[LinkText] forced-colors:text-[LinkText]"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.accent}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] tracking-widest text-slate-500 dark:text-slate-400">
                      SLIDE {String(slide.number).padStart(2, "0")}
                    </span>
                    <span className="block leading-tight">{slide.title}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <ol
        aria-label="熱中症を防ぐ現場ブリーフィング"
        className="space-y-10 print:space-y-0"
      >
        {HEAT_ILLNESS_FIELD_BRIEFING.slides.map((slide) => {
          const theme = getTheme(slide);
          const Icon = theme.icon;
          const reverse = theme.layout === "reverse";
          return (
            <li
              key={slide.id}
              className="list-none print:break-after-page last:print:break-after-auto"
            >
              <article
                id={`slide-${slide.id}`}
                tabIndex={-1}
                data-testid="heat-learning-slide"
                data-slide-layout={theme.layout}
                className={`min-w-0 scroll-mt-24 overflow-hidden rounded-[2rem] border-2 border-slate-800 bg-gradient-to-br shadow-[0_24px_70px_-35px_rgba(15,23,42,.55)] outline-none [overflow-wrap:anywhere] focus-visible:ring-4 focus-visible:ring-orange-400 dark:border-slate-100 print:min-h-[180mm] print:rounded-none print:border-2 print:shadow-none forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${theme.surface}`}
              >
                <div className="grid min-w-0 lg:grid-cols-[minmax(280px,.82fr)_minmax(0,1.18fr)]">
                  <header
                    className={`relative min-w-0 overflow-hidden border-b-2 border-slate-800 p-5 text-white sm:p-7 lg:min-h-[620px] lg:border-b-0 ${
                      reverse ? "lg:order-2 lg:border-l-2" : "lg:border-r-2"
                    } ${theme.stage} dark:border-white forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]`}
                  >
                    <div className="absolute -right-10 -top-14 text-[11rem] font-black leading-none text-white/[.06]" aria-hidden="true">
                      {String(slide.number).padStart(2, "0")}
                    </div>
                    <div className="relative z-10 flex min-h-full flex-col">
                      <div className="flex items-center justify-between gap-4">
                        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${theme.accent}`}>
                          <Icon className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <span className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-black">
                          {slide.number} / {HEAT_ILLNESS_FIELD_BRIEFING.slides.length}
                        </span>
                      </div>
                      <p className="mt-7 text-xs font-black tracking-[.18em] text-yellow-300">{theme.kicker}</p>
                      <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                        {slide.title}
                      </h2>
                      <p className="mt-4 text-base font-semibold leading-7 text-slate-100 sm:text-lg">
                        {slide.lead}
                      </p>
                      <div className="mt-8 flex-1">
                        <SlideVisual slide={slide} />
                      </div>
                    </div>
                  </header>

                  <div className={`min-w-0 p-5 sm:p-7 lg:p-9 ${reverse ? "lg:order-1" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${theme.accent}`}>
                        {slide.eyebrow}
                      </span>
                      <span className="text-xs font-black tracking-widest text-slate-500 dark:text-slate-300">
                        KEY POINTS
                      </span>
                    </div>
                    <ul className="mt-5 space-y-4">
                      {slide.claims.map((claim) => (
                        <li
                          key={claim.id}
                          data-claim-kind={claim.kind}
                          className={`min-w-0 rounded-2xl border-2 p-4 shadow-sm [overflow-wrap:anywhere] forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText] ${CLAIM_KIND_CLASSES[claim.kind]}`}
                        >
                          <p className="flex items-center gap-2 text-xs font-black tracking-wide">
                            <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                            情報種別: {CLAIM_KIND_LABELS[claim.kind]}
                          </p>
                          <p className="mt-3 text-base font-semibold leading-7">
                            {claim.text}
                          </p>
                          <details className="mt-2">
                            <summary className="min-h-11 cursor-pointer py-3 text-xs font-black underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300">
                              根拠と確認箇所
                            </summary>
                            <p className="text-xs leading-5">確認箇所: {claim.locator}</p>
                            <SourceLinks sourceIds={claim.sourceIds} />
                          </details>
                        </li>
                      ))}
                    </ul>

                    <section
                      aria-labelledby={`slide-${slide.id}-action`}
                      className="mt-6 min-w-0 overflow-hidden rounded-2xl border-2 border-emerald-800 bg-emerald-950 text-white [overflow-wrap:anywhere] forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
                    >
                      <div className="flex items-center gap-2 border-b border-emerald-700 bg-emerald-800 px-4 py-3">
                        <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <h3 id={`slide-${slide.id}-action`} className="font-black">
                          今日の確認
                        </h3>
                      </div>
                      <p className="p-4 text-base font-bold leading-7">{slide.fieldAction}</p>
                    </section>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ol>

      <section
        aria-labelledby="slide-source-status-title"
        className="mt-10 rounded-3xl border-2 border-amber-700 bg-amber-50 p-5 text-amber-950 dark:border-amber-300 dark:bg-amber-950/40 dark:text-amber-50 print:break-before-page forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-700 text-white">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black tracking-widest">EVIDENCE & REVIEW</p>
            <h2 id="slide-source-status-title" className="mt-1 text-2xl font-black">
              出典と確認状態
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6">
              すべて公式URLを2026年7月24日に確認しています。ただし、URL確認は個別現場への法的適用を専門家が確認したことを意味しません。
              法令・指針の説明は外部法務レビュー待ち、その他は編集レビュー待ちです。
            </p>
          </div>
        </div>
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {HEAT_LEARNING_SOURCES.map((source) => (
            <li
              key={source.id}
              className="min-w-0 rounded-2xl border border-amber-700 bg-white p-4 text-slate-950 shadow-sm [overflow-wrap:anywhere] dark:border-amber-300 dark:bg-slate-950 dark:text-white forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] max-w-full min-w-0 flex-wrap items-center gap-1 font-black text-sky-900 underline decoration-2 underline-offset-4 [overflow-wrap:anywhere] focus-visible:rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:text-sky-200 forced-colors:text-[LinkText]"
              >
                {source.title}
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
              <dl className="mt-3 grid gap-1 text-xs leading-5">
                <div>
                  <dt className="inline font-bold">発行主体: </dt>
                  <dd className="inline">{source.issuer}</dd>
                </div>
                <div>
                  <dt className="inline font-bold">文書番号: </dt>
                  <dd className="inline">
                    {source.documentNumber ?? "公式Web案内（文書番号なし）"}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-bold">状態: </dt>
                  <dd className="inline">
                    一次資料URL確認済み／
                    {source.reviewStatus === "external-legal-review-pending"
                      ? "外部法務レビュー待ち"
                      : "編集レビュー待ち"}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-bold">限界: </dt>
                  <dd className="inline">{source.limitation}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
