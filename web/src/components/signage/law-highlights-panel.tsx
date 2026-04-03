"use client";

import type { LawRevision } from "@/lib/types/domain";

type LawHighlightsPanelProps = {
  revisions: LawRevision[] | null;
  status: "idle" | "loading" | "success" | "error";
};

export function LawHighlightsPanel({ revisions, status }: LawHighlightsPanelProps) {
  if (status === "loading") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-slate-200">最近の法改正要点</p>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/70" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700/60" />
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-rose-500/80 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-rose-200">最近の法改正要点</p>
        <p className="mt-2 text-base font-bold text-rose-50">自動で法改正を表示できません</p>
        <p className="mt-2 text-sm leading-relaxed text-rose-100/90">
          画面はこのままで構いません。
          <span className="font-semibold">自社ルール・安全基準の最近の変更点がないか</span>
          を確認し、気になる点があれば管理部門に相談してください。
        </p>
      </section>
    );
  }

  const list = revisions?.slice(0, 2) ?? [];

  if (list.length === 0) {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-slate-200">最近の法改正要点</p>
        <p className="mt-2 text-base font-semibold text-slate-50">本日共有すべき新着法改正はありません</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-200/90">
          代わりに、
          <span className="font-semibold">既に施行済みの重要な改正（墜落・重機・感電など）が守られているか</span>
          を確認し、現場の実態とのズレがあれば朝礼で共有してください。
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <p className="text-sm font-semibold tracking-wide text-slate-200">最近の法改正要点</p>
      <div className="mt-3 space-y-3">
        {list.map((rev) => (
          <article key={rev.id} className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="rounded-full bg-sky-500/90 px-2 py-0.5 font-semibold text-slate-50">
                {rev.kind}
              </span>
              <span>{rev.publishedAt}</span>
              <span className="text-slate-400">{rev.issuer}</span>
            </div>
            <h3 className="mt-1 text-sm font-semibold text-slate-50">{rev.title}</h3>
            <p className="mt-1 text-xs text-slate-200">
              現場への影響:{" "}
              {rev.summary.length > 60 ? `${rev.summary.slice(0, 60)}…` : rev.summary || "概要未設定"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

