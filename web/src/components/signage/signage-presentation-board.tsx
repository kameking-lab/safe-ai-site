"use client";

import { AlertTriangle, ExternalLink, Settings2, ShieldCheck } from "lucide-react";

type PresentationTone = "danger" | "caution" | "confirmed" | "pending";

const TONE_CLASS: Record<PresentationTone, string> = {
  danger: "border-red-500 bg-red-950/70 text-red-50",
  caution: "border-amber-400 bg-amber-950/60 text-amber-50",
  confirmed: "border-emerald-500 bg-emerald-950/60 text-emerald-50",
  pending: "border-slate-500 bg-slate-950/70 text-slate-100",
};

export type SignagePresentationBoardProps = {
  regionLabel: string;
  stateLabel: string;
  stateDetail: string;
  stateTone: PresentationTone;
  freshnessLabel: string;
  freshnessDetail: string;
  freshnessTone: PresentationTone;
  warningLabel: string;
  warningDetail: string;
  warningTone: PresentationTone;
  morningPoints: string[];
  officialLinks: Array<{ label: string; href: string }>;
  onOpenSettings?: () => void;
};

export function SignagePresentationBoard({
  regionLabel,
  stateLabel,
  stateDetail,
  stateTone,
  freshnessLabel,
  freshnessDetail,
  freshnessTone,
  warningLabel,
  warningDetail,
  warningTone,
  morningPoints,
  officialLinks,
  onOpenSettings,
}: SignagePresentationBoardProps) {
  return (
    <section
      aria-labelledby="signage-presentation-title"
      data-signage-presentation="1024"
      className="hidden min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2 overflow-hidden min-[1024px]:grid"
    >
      <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-sky-500 bg-sky-950/60 px-4 py-2">
        <div className="min-w-0">
          <p className="text-sm font-black tracking-[.14em] text-sky-300">
            {regionLabel}
          </p>
          <h2 id="signage-presentation-title" className="text-2xl font-black leading-tight text-white">
            朝礼で確認する状態と要点
          </h2>
        </div>
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            data-signage-settings-trigger=""
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-sky-300 bg-sky-800 px-4 text-base font-black text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
          >
            <Settings2 className="h-5 w-5" aria-hidden="true" />
            設定・詳細
          </button>
        ) : null}
      </div>

      <div className="grid min-h-0 grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] gap-2">
        <div className="grid min-h-0 grid-rows-2 gap-2">
          <article className={`min-h-0 overflow-hidden rounded-2xl border-2 p-3 ${TONE_CLASS[stateTone]}`}>
            <p className="text-sm font-black tracking-wide">現在状態</p>
            <p className="mt-1 text-2xl font-black leading-tight">{stateLabel}</p>
            <p className="mt-1 text-base font-semibold leading-6">{stateDetail}</p>
          </article>
          <article className={`min-h-0 overflow-hidden rounded-2xl border-2 p-3 ${TONE_CLASS[freshnessTone]}`}>
            <p className="text-sm font-black tracking-wide">データ鮮度</p>
            <p className="mt-1 text-2xl font-black leading-tight">{freshnessLabel}</p>
            <p className="mt-1 text-base font-semibold leading-6">{freshnessDetail}</p>
          </article>
        </div>

        <div className="grid min-h-0 grid-rows-[minmax(0,.82fr)_minmax(0,1.18fr)] gap-2">
          <article className={`min-h-0 overflow-hidden rounded-2xl border-2 p-3 ${TONE_CLASS[warningTone]}`}>
            <div className="flex items-center gap-2">
              {warningTone === "danger" || warningTone === "caution" ? (
                <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-6 w-6 shrink-0" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-black tracking-wide">気象庁 警報・注意報</p>
                <p className="mt-1 text-2xl font-black leading-tight">{warningLabel}</p>
              </div>
            </div>
            <p className="mt-2 text-base font-semibold leading-6">{warningDetail}</p>
          </article>

          <article className="min-h-0 overflow-hidden rounded-2xl border-2 border-slate-600 bg-slate-950/75 p-3">
            <h3 className="text-xl font-black text-white">朝礼要点</h3>
            <ol className="mt-2 grid gap-1.5 text-base font-semibold leading-6 text-slate-100">
              {morningPoints.slice(0, 3).map((point, index) => (
                <li key={`${index}-${point}`} className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-base font-black text-white">
                    {index + 1}
                  </span>
                  <span className="line-clamp-2">{point}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </div>

      <nav aria-label="公式確認先" className="flex min-h-11 items-center gap-2 overflow-hidden rounded-2xl border border-slate-600 bg-slate-950/80 px-3">
        <span className="shrink-0 text-base font-black text-white">公式確認先</span>
        {officialLinks.slice(0, 3).map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 min-w-0 items-center gap-1 rounded-lg border border-sky-500 bg-sky-950 px-3 text-sm font-black text-sky-100 underline underline-offset-4"
          >
            <span className="truncate">{link.label}</span>
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
        ))}
      </nav>
    </section>
  );
}
