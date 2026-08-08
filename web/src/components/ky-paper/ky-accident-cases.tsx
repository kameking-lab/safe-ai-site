"use client";

/**
 * NIQ-REC1: KY作業内容 → 統合事故DBの類似災害事例カード。
 *
 * KYの「本日の作業内容」から、保有する実在事故事例のうち関連の高いものを提示し、
 * ワンタップで危険のポイント欄へ取り込めるようにする。スコアカード§5-2の規模負け
 * （商用は約3,000件から提案）に対し、当サイトの保有事例を結線して実務価値を出す。
 *
 * 既存 ky-assist（Gemini/擬似AIによる危険提案）との役割分担:
 * - ky-assist（FieldEditorSheetのAI）: 作業内容から危険と対策を「生成」する（創作あり）。
 * - 本パネル: 保有する「実在の労災事例」そのものを根拠付き（発生状況・対策・出典）で提示。
 *   AIは使わず決定論的抽出のみ。生成の下書きと、実例の裏取りを両輪にする。
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, Plus } from "lucide-react";
import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import {
  findSimilarAccidentCasesForKy,
  accidentCaseToRiskDraft,
  type KyRiskDraftFromAccident,
} from "@/lib/ky/accident-similar";
import {
  ACCIDENT_PROVENANCE_INFO,
  resolveAccidentProvenance,
} from "@/lib/accident-source";

const SEVERITY_TONE: Record<string, string> = {
  死亡: "bg-rose-100 text-rose-800",
  重傷: "bg-orange-100 text-orange-800",
  中等傷: "bg-amber-100 text-amber-800",
  軽傷: "bg-slate-100 text-slate-700",
};

export function KyAccidentCasesPanel({
  workText,
  onAdopt,
}: {
  workText: string;
  onAdopt: (draft: KyRiskDraftFromAccident) => void;
}) {
  const [open, setOpen] = useState(false);
  const hits = useMemo(
    () => findSimilarAccidentCasesForKy(workText, getAccidentCasesDataset(), { limit: 4 }),
    [workText]
  );

  if (hits.length === 0) return null;

  return (
    <section className="mx-auto mt-3 max-w-5xl px-4 print:hidden" aria-labelledby="ky-accident-cases-heading">
      <div className="rounded-xl border border-rose-200 bg-rose-50/50">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-[48px] w-full items-center justify-between gap-2 px-4 py-2.5 text-left"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden="true" />
            <span id="ky-accident-cases-heading" className="text-sm font-bold text-rose-800">
              この作業に関連する事故・教材例 {hits.length}件
            </span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              出典区分付き・人の確認必須
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-rose-500 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {open && (
          <div className="space-y-2.5 px-3 pb-3">
            <p className="px-1 text-[11px] text-slate-500">
              関連する保有事例です。取り込む候補を選んでください。
            </p>
            {hits.map(({ case: c }) => {
              const draft = accidentCaseToRiskDraft(c);
              const provenance = resolveAccidentProvenance(c);
              const provenanceInfo = ACCIDENT_PROVENANCE_INFO[provenance];
              const prevention = (c.preventionPoints ?? []).filter((p) => p.trim()).slice(0, 2);
              return (
                <article key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.type}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_TONE[c.severity] ?? "bg-slate-100 text-slate-700"}`}>
                      {c.severity}
                    </span>
                    <span className="text-[10px] text-slate-600">{c.occurredOn}</span>
                    <span className="text-[10px] text-slate-600">・{c.workCategory}</span>
                    <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                      出典区分: {provenanceInfo.label}
                    </span>
                  </div>
                  <h4 className="mt-1.5 text-sm font-bold text-slate-900">{c.title}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-500">発生状況:</span> {c.summary}
                  </p>
                  {prevention.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {prevention.map((p, i) => (
                        <li key={i} className="flex gap-1 text-xs text-emerald-800">
                          <span className="font-semibold text-emerald-700">対策:</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-600">
                      出典: {c.source?.site ?? provenanceInfo.description}
                      {c.source?.url && (
                        <>
                          {" "}
                          <Link href={c.source.url} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">
                            出典ページ
                          </Link>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdopt(draft)}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      危険のポイントへ取り込む
                    </button>
                  </div>
                </article>
              );
            })}
            <p className="px-1 text-[10px] text-slate-600">
              他の事例も検索できます。
              <Link href="/accidents" className="ml-1 text-sky-700 underline">
                事故データベースをすべて見る →
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
