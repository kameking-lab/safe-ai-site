"use client";

import { useMemo } from "react";
import { AlertTriangle, Database, FileText } from "lucide-react";
import {
  searchMhlwSimilar,
  MHLW_DEATHS_TOTAL,
} from "@/lib/mhlw-similar-cases";

/**
 * 入力された作業内容に対し、MHLW 死亡災害 4,043 件から
 * 簡易キーワード重み付けで類似事例 TOP5 を表示する。
 */
export function MhlwSimilarCasesPanel({ query }: { query: string }) {
  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? searchMhlwSimilar(trimmed, 5) : []),
    [trimmed]
  );

  const maxScore = useMemo(
    () => results.reduce((m, r) => Math.max(m, r.score), 1),
    [results]
  );

  if (!trimmed) return null;

  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
        <Database className="h-3.5 w-3.5" aria-hidden="true" />
        類似事例（MHLW 実データ {MHLW_DEATHS_TOTAL.toLocaleString()} 件）TOP {results.length}
      </div>
      <p className="mt-1 text-[11px] text-rose-700/80">
        厚生労働省 死亡災害データベース（2019-2023）から、入力作業内容と一致するキーワードを重み付けして検索した実例です。
      </p>

      {results.length === 0 ? (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
          MHLW 実データに該当する事例が見つかりませんでした。より具体的な作業名・物質名・業種名で検索してください。
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {results.map((r, i) => {
            const ratio = (r.score / maxScore) * 100;
            return (
              <li
                key={r.id}
                className="rounded-lg border border-rose-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        死亡災害
                      </span>
                      {r.type && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {r.type}
                        </span>
                      )}
                      {r.industry && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                          {r.industry}
                          {r.industryMedium ? ` / ${r.industryMedium}` : ""}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {r.year}{r.month ? `-${String(r.month).padStart(2, "0")}` : ""}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                      <FileText className="mr-1 inline h-3 w-3 text-rose-400" aria-hidden="true" />
                      {r.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full bg-rose-500"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">
                        類似度スコア {r.score}
                      </span>
                      {r.matchedTokens.length > 0 && (
                        <span className="text-[10px] text-rose-600">
                          一致: {r.matchedTokens.join("・")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 flex items-start gap-1 text-[10px] text-slate-500">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />
        簡易ベクトル検索（キーワード重み付け）による類似度計算です。実際の事故予防には個別現場の状況を踏まえた専門家判断と組み合わせてください。
      </p>
    </section>
  );
}
