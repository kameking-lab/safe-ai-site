"use client";

import { useState } from "react";
import {
  ASBESTOS_WORK_LEVEL_LABELS_JA,
  type AsbestosWorkLevel,
} from "@/types/asbestos";
import { getWorkPlanTemplate } from "@/lib/asbestos-engine";

const LEVELS: AsbestosWorkLevel[] = ["level-1", "level-2", "level-3"];

const LEVEL_BADGE: Record<AsbestosWorkLevel, string> = {
  "level-1": "bg-rose-700 text-white",
  "level-2": "bg-amber-600 text-white",
  "level-3": "bg-emerald-700 text-white",
};

const LEVEL_BORDER: Record<AsbestosWorkLevel, string> = {
  "level-1": "border-rose-300",
  "level-2": "border-amber-300",
  "level-3": "border-emerald-300",
};

export function WorkPlanViewer() {
  const [level, setLevel] = useState<AsbestosWorkLevel>("level-2");
  const plan = getWorkPlanTemplate(level);

  return (
    <div>
      <div className="flex flex-wrap gap-2 print:hidden">
        {LEVELS.map((l) => (
          <button
            type="button"
            key={l}
            onClick={() => setLevel(l)}
            aria-pressed={l === level}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
              l === level
                ? `${LEVEL_BADGE[l]} border-transparent`
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {ASBESTOS_WORK_LEVEL_LABELS_JA[l]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          印刷する
        </button>
      </div>

      <article
        className={`mt-5 rounded-xl border bg-white p-5 md:p-6 ${LEVEL_BORDER[plan.level]}`}
      >
        <header>
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${LEVEL_BADGE[plan.level]}`}
          >
            {ASBESTOS_WORK_LEVEL_LABELS_JA[plan.level]}
          </span>
          <h2 className="mt-2 text-lg font-bold text-slate-900">{plan.title}</h2>
          <p className="mt-2 text-sm text-slate-700">{plan.summary}</p>
        </header>

        <SubSection title="隔離養生・現場管理" items={plan.isolation} />
        <SubSection title="呼吸用保護具・保護衣" items={plan.ppe} />
        <SubSection title="届出・掲示" items={plan.notifications} />

        <div className="mt-6 space-y-5">
          {plan.sections.map((s) => (
            <section
              key={s.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 print:break-inside-avoid"
            >
              <h3 className="text-sm font-bold text-slate-900">{s.heading}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {s.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">根拠条文</h3>
          <ul className="mt-2 space-y-2 text-xs text-slate-700">
            {plan.lawReferences.map((lr, idx) => (
              <li key={`${lr.name}-${idx}`} className="rounded border border-slate-200 bg-slate-50 p-2">
                <p className="font-semibold text-slate-900">{lr.name}</p>
                {lr.articles && lr.articles.length > 0 && (
                  <p className="text-slate-600">{lr.articles.join("・")}</p>
                )}
                <p className="mt-1 text-slate-700">{lr.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <p className="mt-4 text-xs text-slate-500">
        本テンプレートは石綿障害予防規則・関連通達の公開情報に基づく独自整理であり、特定の現場に合わせた専門家確認を前提として活用してください。
      </p>
    </div>
  );
}

function SubSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
