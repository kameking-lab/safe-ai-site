"use client";

import type { AccidentCase } from "@/lib/types/domain";

type IncidentHighlightsPanelProps = {
  cases: AccidentCase[] | null;
  status: "idle" | "loading" | "success" | "error";
};

export function IncidentHighlightsPanel({ cases, status }: IncidentHighlightsPanelProps) {
  if (status === "loading") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-slate-200">本日の事故ピックアップ</p>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-700/70" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/60" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700/60" />
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-rose-500/80 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-rose-200">本日の事故ピックアップ</p>
        <p className="mt-2 text-base font-bold text-rose-50">自動で事故事例を表示できません</p>
        <p className="mt-2 text-sm leading-relaxed text-rose-100/90">
          画面はこのままで構いません。
          <span className="font-semibold">直近のヒヤリハットや自社の災害事例から、今日の作業に近い1件</span>
          を選び、朝礼で簡単に共有してください。
        </p>
      </section>
    );
  }

  const list = cases?.slice(0, 2) ?? [];

  if (list.length === 0) {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
        <p className="text-sm font-semibold tracking-wide text-slate-200">本日の事故ピックアップ</p>
        <p className="mt-2 text-base font-semibold text-slate-50">本日共有すべき重大事故事例は登録されていません</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-200/90">
          代わりに、
          <span className="font-semibold">足元・高所・電気の3点確認</span>
          を行い、ヒヤリとした場面があれば朝礼後に必ず共有してください。
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <p className="text-sm font-semibold tracking-wide text-slate-200">本日の事故ピックアップ</p>
      <div className="mt-3 space-y-3">
        {list.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-700/80 bg-slate-900/80 p-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-rose-500/90 px-2 py-0.5 font-semibold text-slate-50">
                {item.type}
              </span>
              <span className="text-slate-300">{item.occurredOn}</span>
            </div>
            <h3 className="mt-1 text-sm font-semibold text-slate-50">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-200 line-clamp-2">{item.summary}</p>
            <dl className="mt-2 space-y-1 text-xs text-slate-200">
              <div>
                <dt className="inline font-semibold text-slate-100">要因一言:</dt>
                <dd className="inline"> {item.mainCauses[0] ?? "基本ルールの形骸化"}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-slate-100">防止一言:</dt>
                <dd className="inline"> {item.preventionPoints[0] ?? "手順とチェックを声に出して確認する"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

