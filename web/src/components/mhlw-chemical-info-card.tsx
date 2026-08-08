"use client";

import Link from "next/link";
import { BookOpen, Database, ExternalLink, Gauge, ArrowRight } from "lucide-react";
import type { MergedChemical, ConcentrationLimitEntry } from "@/lib/mhlw-chemicals";
import { regulatoryLabels, relatedLawTexts, EXTERNAL_REF_LABEL } from "@/lib/chemical/mhlw-labels";
import { getSupplementalInfo } from "@/lib/chemical/supplemental-info";
import { SITE_STATS } from "@/data/site-stats";
import { RegulationTagBadgeList } from "@/components/regulation-tag-badge";
import { RegulationTagsSection } from "@/components/regulation-tags-section";
import {
  normalizeTags,
  oshaTagsForCas,
  isSpecialControlSubstance,
  REGULATION_TAGS,
} from "@/lib/regulation-tag-labels";

/**
 * 厚労省・NITE等の公的資料を統合した物質詳細カード。
 * 収録フラグは法的な非該当判定に使わず、未収録は「未確認」と表示する。
 * 測定条件・単位・平均時間を検証できないため、濃度の自動適否判定は行わない。
 */
export function MhlwChemicalInfoCard({ chemical }: { chemical: MergedChemical }) {
  const reg = regulatoryLabels(chemical.flags);
  const laws = relatedLawTexts(chemical.flags);
  const supplemental = getSupplementalInfo(chemical.cas);
  // MHLW 濃度基準値 (八時間) 優先、なければ特化則・有機則の管理濃度で補完
  const limit8h = chemical.details?.limit8h ?? supplemental?.oel;
  const limit8hSource: "mhlw" | "oel" | null = chemical.details?.limit8h
    ? "mhlw"
    : supplemental?.oel
      ? "oel"
      : null;
  const limitShort = chemical.details?.limitShort;
  const link = chemical.details?.link;
  const isCarcinogenic =
    chemical.flags.carcinogenic || supplemental?.carcinogenic === true;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
        <Database className="h-3.5 w-3.5" aria-hidden="true" />
        公的化学物質統合データ（MHLW・NITE等／{SITE_STATS.mhlwMergedChemicalCount} 物質）
      </div>
      <h3 className="mt-1 text-base font-bold text-slate-900">{chemical.primaryName}</h3>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        {chemical.cas && (
          <span className="rounded-md bg-white px-1.5 py-0.5 font-mono">CAS {chemical.cas}</span>
        )}
        {chemical.aliases.slice(0, 3).map((a) => (
          <span key={a} className="text-slate-500">別名: {a}</span>
        ))}
        {chemical.cas && (
          <Link
            href={`/chemical-database/${encodeURIComponent(chemical.cas)}`}
            className="ml-auto inline-flex items-center gap-0.5 text-emerald-700 hover:text-emerald-900 underline"
          >
            DB詳細
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      {/* Phase 1e: 規制タグバッジ (一覧での視認性) */}
      {(() => {
        const tags = normalizeTags(chemical.details?.limits?.regulationTags);
        if (tags.length === 0) return null;
        return (
          <div className="mt-2">
            <RegulationTagBadgeList tags={tags} maxVisible={6} size="xs" />
          </div>
        );
      })()}

      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-white p-3">
          <dt className="flex items-center gap-1 font-semibold text-amber-700">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            {limit8hSource === "oel" ? "管理濃度（八時間）" : "濃度基準値（八時間）"}
          </dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {limit8h ? (
              <>
                {limit8h}
                {limit8hSource === "oel" && (
                  <span className="ml-1 text-[10px] font-normal text-slate-500">
                    ※特化則・有機則の管理濃度
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-400 text-sm font-normal">データ未登録</span>
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-white p-3">
          <dt className="flex items-center gap-1 font-semibold text-amber-700">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            濃度基準値（短時間）
          </dt>
          <dd className="mt-1 text-base font-bold text-slate-900">
            {limitShort ?? (
              <span className="text-slate-400 text-sm font-normal">データ未登録</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
        <FlagBadge label="SDS交付義務" on={chemical.flags.label_sds} />
        <FlagBadge label="濃度基準値設定" on={chemical.flags.concentration} />
        <FlagBadge label="皮膚等障害" on={chemical.flags.skin} />
        <FlagBadge label="がん原性" on={isCarcinogenic} />
      </div>

      {supplemental?.ghs && supplemental.ghs.length > 0 && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="text-xs font-semibold text-slate-600">GHS分類（主要ハザード）</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {supplemental.ghs.map((g) => (
              <span
                key={g}
                className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {supplemental?.healthEffects && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="text-xs font-semibold text-slate-600">主な健康影響</p>
          <p className="mt-1 text-xs text-slate-700">{supplemental.healthEffects}</p>
        </div>
      )}

      {reg.length > 0 && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            規制区分
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
            {reg.map((r) => (
              <li key={r} className="flex items-start gap-1">
                <span className="text-emerald-500">▸</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {laws.length > 0 && (
        <div className="mt-3 rounded-lg bg-white p-3">
          <p className="text-xs font-semibold text-slate-600">関連法令 (安衛法系)</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
            {laws.map((l) => (
              <li key={l} className="flex items-start gap-1">
                <span className="text-blue-500">§</span>
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* P0-009 (usability-audit-day2): 労働安全衛生 特別則 (特化則/有機則/
          酸欠則/粉じん則/石綿則) を CAS から自動引き当てして表示。
          製造業/建設業安全担当者の最頻ユースケース対応。 */}
      <OshaRegulationsSection cas={chemical.cas} />

      {/* Phase 1e: 規制タグから自動生成する関連法令 (PRTR/化審法/毒劇法/CWC/廃掃法) */}
      {chemical.details?.limits && (
        <div className="mt-3">
          <RegulationTagsSection entry={chemical.details.limits} variant="card" />
        </div>
      )}

      {chemical.details?.uses && (
        <p className="mt-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">主な用途:</span> {chemical.details.uses}
        </p>
      )}

      <ExternalRefsLinks externalRefs={chemical.details?.limits?.externalRefs} />

      {limit8h && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            測定値との自動比較は行いません
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-950">
            表示値は {limit8h} です。適否には単位、測定方法、平均時間、混合ばく露等の確認が必要です。
            最新の製品SDS、厚生労働省・NITEの公式資料、作業環境測定の担当者で確認してください。
          </p>
        </div>
      )}

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          厚生労働省 濃度基準値等の公表資料（製品SDSではありません）
        </a>
      )}
    </div>
  );
}

/**
 * 学会値(ACGIH/JSOH)の公式参照リンク。
 * 著作権リスク回避のため数値は本サイトに非収録。
 */
function ExternalRefsLinks({
  externalRefs,
}: {
  externalRefs?: ConcentrationLimitEntry["externalRefs"];
}) {
  if (!externalRefs) return null;
  const items: { key: "acgih" | "jsoh"; url: string; hint: string }[] = [];
  if (externalRefs.acgih) {
    items.push({
      key: "acgih",
      url: externalRefs.acgih.url,
      hint: externalRefs.acgih.lookupHint,
    });
  }
  if (externalRefs.jsoh) {
    items.push({
      key: "jsoh",
      url: externalRefs.jsoh.url,
      hint: externalRefs.jsoh.lookupHint,
    });
  }
  if (items.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
      <p className="text-xs font-semibold text-sky-900">
        学会値の公式参照（数値は本サイトに非収録）
      </p>
      <p className="mt-1 text-[11px] text-sky-800">
        ACGIH TLV・JSOH 許容濃度は著作物のため、各学会公式サイトでご確認ください。
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((it) => (
          <a
            key={it.key}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-50"
            title={it.hint}
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {EXTERNAL_REF_LABEL[it.key]}
          </a>
        ))}
      </div>
    </div>
  );
}

/**
 * P0-009: 労働安全衛生 特別則セクション。
 * CAS マッピングから特化則/有機則/酸欠則/粉じん則/石綿則のタグを引き当て、
 * 該当があれば short label + 概要 + e-Gov 直リンクを表示。
 * 該当なしの物質ではセクション自体を非表示。
 */
function OshaRegulationsSection({ cas }: { cas: string | null }) {
  const oshaTags = oshaTagsForCas(cas);
  if (oshaTags.length === 0) return null;
  const special = isSpecialControlSubstance(cas);
  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
      <p className="flex items-center gap-1 text-xs font-semibold text-red-700">
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        労働安全衛生 特別則
        {special && (
          <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-900">
            特別管理物質
          </span>
        )}
      </p>
      <ul className="mt-2 space-y-2 text-xs text-slate-700">
        {oshaTags.map((tag) => {
          const info = REGULATION_TAGS[tag];
          return (
            <li key={tag} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${info.badgeClass}`}>
                  {info.shortLabel}
                </span>
                <a
                  href={info.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-slate-800 underline"
                >
                  e-Gov 法令
                  <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                </a>
              </div>
              <p className="ml-1 text-[11px] leading-relaxed text-slate-600">
                {info.summary}
              </p>
            </li>
          );
        })}
      </ul>
      {special && (
        <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-[11px] text-red-900">
          特別管理物質: 作業環境測定結果・特殊健診結果・作業記録を 30 年間保存する義務があります (特化則 第38条の4)。
        </p>
      )}
    </div>
  );
}

function FlagBadge({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
        on ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"
      }`}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xs font-bold">
        {on ? "収録データで該当" : "収録データ上未確認"}
      </span>
    </div>
  );
}
