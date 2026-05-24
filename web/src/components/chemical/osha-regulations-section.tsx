/**
 * P0-009 (usability-audit-day2-2026-05-24):
 * 化学物質詳細ページ用の「労働安全衛生 特別則」セクション。
 *
 * 特化則/有機則/酸欠則/粉じん則/石綿則のタグを CAS から自動引き当てし、
 * 該当物質 (建設業/製造業の最頻 22 物質) では一望表示する。MHLW フラグ
 * (577条の2 / 594条の2 / がん原性 / SDS 等) は既存セクションで表示済の
 * ため、ここでは特別則のみに絞って重複を避ける。
 *
 * 該当タグがない物質ではセクションごと非表示。Server Component から
 * 直接 import できるように Client/Server 中立な実装にした。
 */

import { BookOpen, ExternalLink } from "lucide-react";
import {
  oshaTagsForCas,
  isSpecialControlSubstance,
  REGULATION_TAGS,
} from "@/lib/regulation-tag-labels";

export function OshaRegulationsSection({ cas }: { cas: string | null }) {
  const oshaTags = oshaTagsForCas(cas);
  if (oshaTags.length === 0) return null;
  const special = isSpecialControlSubstance(cas);
  return (
    <section
      aria-labelledby="osha-regulations-heading"
      className="rounded-xl border border-red-200 bg-red-50/30 p-4"
    >
      <h2
        id="osha-regulations-heading"
        className="flex items-center gap-2 text-sm font-bold text-red-700"
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        労働安全衛生 特別則
        {special && (
          <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-900">
            特別管理物質
          </span>
        )}
      </h2>
      <p className="mt-1 text-xs text-red-800">
        本物質に適用される労働安全衛生関係の特別則 (特化則・有機則・酸欠則・粉じん則・石綿則) を表示しています。
      </p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {oshaTags.map((tag) => {
          const info = REGULATION_TAGS[tag];
          return (
            <li key={tag} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${info.badgeClass}`}
                >
                  {info.shortLabel}
                </span>
                <a
                  href={info.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  e-Gov 法令
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {info.summary}
              </p>
            </li>
          );
        })}
      </ul>
      {special && (
        <p className="mt-3 rounded bg-red-50 px-2 py-2 text-xs text-red-900">
          <strong>特別管理物質:</strong>{" "}
          作業環境測定結果・特殊健診結果・作業記録を 30 年間保存する義務があります (特化則 第38条の4)。
        </p>
      )}
    </section>
  );
}
