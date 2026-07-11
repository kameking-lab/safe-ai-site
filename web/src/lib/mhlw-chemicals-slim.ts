/**
 * クライアント用スリム化学物質索引（速度改善・2026-07-11）
 *
 * mhlw-chemicals.ts（compact.json 1.1MB + concentration-limits.json 2.0MB を同梱）の
 * クライアント代替。検索・一覧・RA判定に必要な射影だけを持つ生成物
 * chemical-slim-index.json（約0.6MB）から MergedChemical 互換オブジェクトを復元する。
 *
 * 整合性は mhlw-chemicals-slim.test.ts が getAllMergedChemicals() と全件比較して担保
 * （データ更新時は scripts/etl/build-chemical-slim-index.py を再実行）。
 * サーバーコンポーネント（詳細ページ等）は従来どおり mhlw-chemicals.ts を使うこと。
 */
import slimRaw from "@/data/chemical-slim-index.json";
import type { ConcentrationLimitEntry, LimitValue, MergedChemical } from "./mhlw-chemicals";
import { casMatches, normalizeCas, normalizeText } from "./chemical/cas-text-helpers";

type SlimEntry = {
  c: string | null;
  n: string;
  a?: string[];
  f: number;
  tier: "mhlw_177" | "external_only" | "reference" | "none";
  twa?: LimitValue;
  stel?: LimitValue;
  ceil?: LimitValue;
  t?: string[];
  iarc?: string;
  sds?: string;
  pr?: string[];
  cr?: string[];
  ch?: 1;
  x?: number;
  dl8?: string;
  dls?: string;
  link?: string;
  uses?: string;
};

const SLIM = slimRaw as { meta: { count: number; sourceVersion?: string }; entries: SlimEntry[] };

/** UI 表示用: CAS 統合後の物質件数（mhlw-chemicals.MHLW_MERGED_CHEMICAL_COUNT と一致） */
export const MHLW_MERGED_CHEMICAL_COUNT_SLIM: number = SLIM.meta.count;

const ACGIH_REF = {
  url: "https://www.acgih.org/tlv-bei-guidelines/",
  lookupHint: "ACGIH TLVs and BEIs 年次版を公式サイトで参照(英文/会員向け)",
} as const;
const JSOH_REF = {
  url: "https://www.sanei.or.jp/topics/recommendation.html",
  lookupHint: "日本産業衛生学会 許容濃度等の勧告を公式サイトで参照",
} as const;
const PRTR_URL = "https://www.env.go.jp/chemi/prtr/risk0.html";

function fmt(v?: LimitValue): string | undefined {
  return v ? `${v.value} ${v.unit}` : undefined;
}

function toMerged(s: SlimEntry): MergedChemical {
  const limits: ConcentrationLimitEntry | undefined =
    s.tier === "none" && !s.t && !s.twa && !s.stel && !s.ceil
      ? undefined
      : {
          name: s.n,
          ...(s.twa ? { twa: s.twa } : {}),
          ...(s.stel ? { stel: s.stel } : {}),
          ...(s.ceil ? { ceiling: s.ceil } : {}),
          ...(s.t ? { regulationTags: s.t } : {}),
          ...(s.iarc ? { iarcGroup: s.iarc as ConcentrationLimitEntry["iarcGroup"] } : {}),
          ...(s.sds ? { mhlwSdsUrl: s.sds } : {}),
          ...(s.pr ? { prtrLawReferences: s.pr } : {}),
          ...(s.cr ? { chashinLawReferences: s.cr } : {}),
          ...(s.ch && s.c
            ? { niteChripUrl: `https://www.chem-info.nite.go.jp/chem/ghs/m-nite-${s.c}.html` }
            : {}),
          ...(s.t?.some((t) => t === "prtr1" || t === "prtr2") ? { prtrUrl: PRTR_URL } : {}),
          ...(s.x
            ? {
                externalRefs: {
                  ...((s.x & 1) !== 0 ? { acgih: ACGIH_REF } : {}),
                  ...((s.x & 2) !== 0 ? { jsoh: JSOH_REF } : {}),
                },
              }
            : {}),
        };
  const limit8h = fmt(s.twa) ?? s.dl8;
  const limitShort = fmt(s.stel) ?? fmt(s.ceil) ?? s.dls;
  return {
    cas: s.c,
    primaryName: s.n,
    aliases: s.a ?? [],
    flags: {
      carcinogenic: (s.f & 1) !== 0,
      concentration: (s.f & 2) !== 0,
      skin: (s.f & 4) !== 0,
      label_sds: (s.f & 8) !== 0,
    },
    appliedDates: {},
    notes: [],
    details: {
      ...(limit8h ? { limit8h } : {}),
      ...(limitShort ? { limitShort } : {}),
      ...(s.link ? { link: s.link } : {}),
      ...(s.uses ? { uses: s.uses } : {}),
      ...(limits ? { limits } : {}),
      tier: s.tier,
    },
    entryCount: 0,
  };
}

let _all: MergedChemical[] | null = null;
/** CAS 統合済みの全物質（スリム射影）。クライアント側でキャッシュ。 */
export function getAllMergedChemicalsSlim(): MergedChemical[] {
  if (!_all) {
    _all = SLIM.entries.map(toMerged);
    // mhlw-chemicals.mergeByCas と同順（CASあり優先→名称の日本語照合順）。
    // 同点スコア検索のタイブレークまで全量統合と一致させる。
    _all.sort((a, b) => {
      if ((a.cas ? 0 : 1) !== (b.cas ? 0 : 1)) return a.cas ? -1 : 1;
      return a.primaryName.localeCompare(b.primaryName, "ja");
    });
  }
  return _all;
}

/** 物質名 / CAS / 別名でフリーワード検索（mhlw-chemicals.searchMergedChemicals と同スコアリング） */
export function searchMergedChemicalsSlim(query: string, limit = 30): MergedChemical[] {
  const all = getAllMergedChemicalsSlim();
  if (!query.trim()) return all.slice(0, limit);
  const qNorm = normalizeText(query);
  const scored: { m: MergedChemical; score: number }[] = [];
  for (const m of all) {
    let score = 0;
    if (m.cas && casMatches(query, m.cas)) score += 100;
    const pn = normalizeText(m.primaryName);
    if (pn === qNorm) score += 80;
    else if (pn.startsWith(qNorm)) score += 40;
    else if (pn.includes(qNorm)) score += 20;
    for (const a of m.aliases) {
      if (normalizeText(a).includes(qNorm)) {
        score += 10;
        break;
      }
    }
    if (score > 0) scored.push({ m, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.m);
}

/** CAS 完全一致で 1 件取得。 */
export function findByCasSlim(cas: string): MergedChemical | undefined {
  const target = normalizeCas(cas);
  if (!target) return undefined;
  return getAllMergedChemicalsSlim().find((m) => m.cas && normalizeCas(m.cas) === target);
}
