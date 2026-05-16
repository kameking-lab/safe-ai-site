"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Copy, Printer } from "lucide-react";
import {
  R7_COMPLIANCE_ITEMS,
  R7_TEMPLATE_BLOCKS,
} from "@/data/heat-illness-rules";

type CheckState = Record<string, boolean>;

const INITIAL_CHECKS: CheckState = R7_COMPLIANCE_ITEMS.reduce<CheckState>(
  (acc, item) => {
    acc[item.id] = false;
    return acc;
  },
  {},
);

export function R7ComplianceClient() {
  const [checks, setChecks] = useState<CheckState>(INITIAL_CHECKS);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const done = Object.values(checks).filter(Boolean).length;
    return { done, total: R7_COMPLIANCE_ITEMS.length };
  }, [checks]);

  function toggle(id: string) {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function copyTemplate(id: string, body: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard is best-effort; ignore failures.
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  const percent = Math.round((summary.done / summary.total) * 100);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-rose-900">
            実施状況：{summary.done} / {summary.total} 項目 ({percent}%)
          </h2>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 print:hidden"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            印刷
          </button>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-rose-200"
          aria-hidden="true"
        >
          <div
            className="h-full bg-rose-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-rose-800">
          安衛則第612条の2 改正（令和7年6月1日施行）に対応した社内点検用チェックリストです。
          チェックは端末内のみで保持され、サーバには送信されません。
        </p>
      </section>

      <section aria-labelledby="checklist-heading">
        <h2
          id="checklist-heading"
          className="text-base font-bold text-slate-900"
        >
          R7改正コンプライアンス チェックリスト（8項目）
        </h2>
        <ul className="mt-4 space-y-3">
          {R7_COMPLIANCE_ITEMS.map((item) => {
            const done = checks[item.id];
            return (
              <li
                key={item.id}
                className={`rounded-xl border p-4 shadow-sm transition ${
                  done
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-slate-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex w-full items-start gap-3 text-left"
                  aria-pressed={done}
                >
                  {done ? (
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
                      aria-hidden="true"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.title}
                      </h3>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {item.articleRef}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {item.requirement}
                    </p>
                  </div>
                </button>
                <div className="mt-3 ml-8">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    監督官が確認しやすい証跡
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs leading-5 text-slate-700">
                    {item.evidenceExpected.map((e) => (
                      <li key={e}>・{e}</li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="templates-heading">
        <h2
          id="templates-heading"
          className="text-base font-bold text-slate-900"
        >
          社内文書テンプレート（4種）
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          各テンプレートはコピーして社内文書管理システム・Wordに貼り付け、
          [括弧内]の項目を自社情報に置き換えてください。
        </p>
        <div className="mt-4 space-y-4">
          {R7_TEMPLATE_BLOCKS.map((tpl) => (
            <article
              key={tpl.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {tpl.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {tpl.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyTemplate(tpl.id, tpl.body)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 print:hidden"
                >
                  <Copy className="h-3 w-3" aria-hidden="true" />
                  {copiedId === tpl.id ? "コピー済み" : "本文をコピー"}
                </button>
              </header>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-800">
{tpl.body}
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        <p>
          出典：労働安全衛生規則第612条の2 改正（令和7年6月1日施行、厚生労働省令第86号）、
          厚生労働省「職場における熱中症予防対策マニュアル」。
        </p>
        <p className="mt-1">
          本チェックリストは自主点検用です。労働基準監督署の指導は個別事業場の実態を踏まえて行われます。
          詳細な解釈は所轄監督署・産業医・社労士にご確認ください。
        </p>
      </section>
    </div>
  );
}
