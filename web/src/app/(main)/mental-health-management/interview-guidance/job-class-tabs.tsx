"use client";

import { useState } from "react";
import { JOB_CLASS_LABELS, type JobClass } from "@/types/mental-health";
import { JOB_CLASS_OVERLAY } from "@/data/mental-health-rules";

const JOB_CLASSES = Object.keys(JOB_CLASS_LABELS) as JobClass[];

export function JobClassTabs() {
  const [active, setActive] = useState<JobClass>("office");
  const bullets = JOB_CLASS_OVERLAY[active];

  return (
    <div>
      <div
        role="tablist"
        aria-label="職種"
        className="flex flex-wrap gap-2"
      >
        {JOB_CLASSES.map((c) => (
          <button
            key={c}
            role="tab"
            type="button"
            aria-selected={active === c}
            onClick={() => setActive(c)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active === c
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-violet-400"
            }`}
          >
            {JOB_CLASS_LABELS[c]}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4"
      >
        <p className="text-xs font-semibold text-violet-700">
          {JOB_CLASS_LABELS[active]} ─ 措置案
        </p>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-800">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
