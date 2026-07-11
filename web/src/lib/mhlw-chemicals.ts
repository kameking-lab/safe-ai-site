import compact from "@/data/chemicals-mhlw/compact.json";
import concentrationLimitsRaw from "@/data/concentration-limits.json";

export type MhlwChemicalCategory =
  | "carcinogenic"
  | "concentration"
  | "skin"
  | "label_sds"
  | "other";

/** 濃度値（{value, unit, source}） */
export type LimitValue = {
  value: string;
  unit: string;
  /** SOURCES マップのキー */
  source?: string;
};

/**
 * 主要出典の判定ラベル
 *
 * v3.0.0 (2026-05-24): 学会値(JSOH/ACGIH)は著作権リスク回避のため数値非収録。
 * 公式参照リンクは externalRefs フィールドで提供。
 */
export type LimitSource = "mhlw" | "reference";

/** IARC 発がん性分類 */
export type IarcGroup = "1" | "2A" | "2B" | "3";

/** 学会値の公式参照リンク(数値は非収録) */
export type ExternalReference = {
  url: string;
  lookupHint: string;
};

/** NITE 由来の主要 GHS 区分まとめ (Phase 1b 追加、政府版GHS分類) */
export type NiteGhsClassifications = {
  carcinogen?: string;
  mutagen?: string;
  reproTox?: string;
  skinSens?: string;
  respSens?: string;
  skinCorrIrr?: string;
  eyeDamageIrr?: string;
  stotSingle?: string;
  stotRepeat?: string;
  aspiration?: string;
};

/** 物質単位の濃度・発がん性データ（concentration-limits.json v3.0.0 / v3.1.0で NITE 拡張） */
export type ConcentrationLimitEntry = {
  name?: string;
  nameEn?: string;
  twa?: LimitValue;
  stel?: LimitValue;
  ceiling?: LimitValue;
  carcinogenicity?: {
    iarc?: string;
    monograph?: string;
    ghs?: string;
    /** Phase 1b 追加: NITE 由来 GHS 発がん性区分 (例 "区分1A") */
    ghsClass?: string;
    source?: string;
  };
  mhlwSdsUrl?: string;
  notes?: string[];
  /** 主要出典の判定（mhlw=国の数値 / reference=参考値・国の数値なし） */
  source?: LimitSource;
  /** IARC 分類のフラット参照 */
  iarcGroup?: IarcGroup | null;
  /**
   * 学会値の公式参照リンク (数値は著作権ありのため非収録)
   * - acgih: ACGIH TLVs and BEIs 公式サイト
   * - jsoh:  日本産業衛生学会 許容濃度等の勧告 公式サイト
   */
  externalRefs?: {
    acgih?: ExternalReference;
    jsoh?: ExternalReference;
  };
  /**
   * Phase 1b/1c/1d 追加: 法規制タグ
   * - "nite": NITE 統合版 GHS 分類
   * - "prtr1" / "prtr2": 化管法 PRTR 第一種/第二種指定化学物質
   * - "cscl1" / "cscl2" / "cscl-other": 化審法 第一種特定/第二種特定/その他特定
   * - "poison-control": 毒物及び劇物取締法
   * - "cwc": 化学兵器禁止法
   * - "waste": 廃棄物処理法 特定有害産業廃棄物
   */
  regulationTags?: string[];
  /** Phase 1b 追加: NITE 統合版 GHS 分類詳細ページ URL */
  niteChripUrl?: string;
  /** Phase 1b 追加: NITE 由来の主要 GHS 区分まとめ */
  niteGhsClassifications?: NiteGhsClassifications;
  /** Phase 1c 追加: PRTR 制度公式参照 URL */
  prtrUrl?: string;
  /** Phase 1c 追加: PRTR 関連の法令別表参照 (例: "化管法施行令 412CO0000000138 別表第一") */
  prtrLawReferences?: string[];
  /** Phase 1d 追加: 化審法/毒劇法/化学兵器禁止法/廃掃法 の法令別表参照 */
  chashinLawReferences?: string[];
};

type ConcentrationLimitsFile = {
  generatedAt: string;
  version: string;
  policy?: {
    description: string;
    removedSources: string[];
    removedAt: string;
    authority?: string;
  };
  sources: Record<string, string>;
  summary: {
    total: number;
    withMhlw: number;
    withIarc: number;
    withExternalAcgihRef?: number;
    withExternalJsohRef?: number;
    /** Phase 1b 追加 */
    withRegulationNite?: number;
    /** Phase 1b 追加 */
    withNiteGhs?: number;
    /** Phase 1c 追加 */
    withPrtr?: number;
    /** Phase 1d 追加 */
    withChashin?: number;
  };
  niteImport?: {
    importedAt: string;
    sourceCount: number;
    merged: number;
    added: number;
    sourceSha256?: string | null;
    sourceUrl?: string;
  };
  /** Phase 1c 追加 */
  prtrImport?: {
    importedAt: string;
    /** O11 (2026-07-11) 公式NITEリスト置換後は sourceCount/merged/added は持たない */
    sourceCount?: number;
    merged?: number;
    added?: number;
    class1Tagged?: number;
    class2Tagged?: number;
    /** 公式リストの政令上の物質数（第一種515/第二種134） */
    class1Count?: number;
    class2Count?: number;
    source?: string;
    sourceUrl?: string;
    sourceSha256?: string | null;
    upstreamReference?: string;
    mirror?: string;
    note?: string;
  };
  /** O11 (2026-07-11): 毒劇法タグの正本突合メタ */
  dokugekiVerify?: {
    verifiedAt: string;
    source: string;
    index: string;
    added: number;
    removedFalsePositives: number;
    keptUnverified: number;
    note?: string;
  };
  /** Phase 1d 追加 */
  chashinImport?: {
    importedAt: string;
    sourceCount: number;
    merged: number;
    added: number;
    tagCounts?: Record<string, number>;
    sourceSha256?: string | null;
    upstreamReference?: string;
    mirror?: string;
    knownLimitation?: string;
  };
  substances: Record<string, ConcentrationLimitEntry>;
};

export const CONCENTRATION_LIMITS = concentrationLimitsRaw as unknown as ConcentrationLimitsFile;

export type MhlwChemicalDetails = {
  /** 八時間濃度基準値 (例: "20 ppm" / "5 ㎎/㎥") */
  limit8h?: string;
  /** 短時間濃度基準値 */
  limitShort?: string;
  /** モデル SDS の推奨用途 */
  uses?: string;
  /** 厚労省 公式 SDS PDF リンク */
  link?: string;
  /** 濃度・発がん性の構造化データ（concentration-limits.json）*/
  limits?: ConcentrationLimitEntry;
  /** データの優先度: 濃度基準値 > 学会公式参照のみ > 参考値 > なし */
  tier?: DataTier;
};

export type MhlwChemicalEntry = {
  name: string;
  cas: string | null;
  category: MhlwChemicalCategory;
  categoryLabel: string;
  appliedDate: string | null;
  notes: string[];
  details?: MhlwChemicalDetails;
};

export type MhlwChemicalCompact = {
  generatedAt: string;
  kept: number;
  categoryCounts: Record<string, number>;
  categoryLabels: Record<string, string>;
  entries: MhlwChemicalEntry[];
};

/** CAS 単位でマージしたビュー */
export type MergedChemical = {
  cas: string | null;
  /** 最も情報量の多い名称 */
  primaryName: string;
  /** エントリ間で異なる表記 */
  aliases: string[];
  flags: {
    carcinogenic: boolean;
    concentration: boolean;
    skin: boolean;
    label_sds: boolean;
  };
  /** カテゴリ別の適用日（あれば） */
  appliedDates: Partial<Record<MhlwChemicalCategory, string>>;
  /** カテゴリ別の備考（あれば） */
  notes: string[];
  /** 詳細値（濃度基準値・推奨用途・SDS リンクなど） */
  details?: MhlwChemicalDetails;
  /** 元データの件数（デバッグ用） */
  entryCount: number;
};

// 表示用ラベル・バッジ定数は chemical/mhlw-labels.ts へ分離（クライアント軽量化）。互換再輸出。
export {
  CATEGORY_LABELS_JA,
  CATEGORY_BADGE,
  CATEGORY_TO_LAW,
  SOURCE_LABEL,
  SOURCE_BADGE,
  PRIMARY_SOURCE_LABEL,
  PRIMARY_SOURCE_BADGE,
  EXTERNAL_REF_LABEL,
  IARC_BADGE,
  IARC_LABEL,
  TIER_LABEL,
  TIER_BADGE,
  MANAGEMENT_VS_LIMIT_DISCLAIMER,
  regulatoryLabels,
  relatedLawTexts,
} from "./chemical/mhlw-labels";
export type { DataTier } from "./chemical/mhlw-labels";
import type { DataTier } from "./chemical/mhlw-labels";

export const rawCompact = compact as unknown as MhlwChemicalCompact;

export const MHLW_CHEMICALS_SOURCE =
  "厚生労働省 皮膚等障害化学物質リスト・SDS交付義務物質一覧・がん原性物質一覧・濃度基準値設定物質";

/**
 * 濃度基準値・発がん性分類は scripts/etl/fetch-concentration-limits.mjs で
 * 生成された web/src/data/concentration-limits.json を出典とする。
 *
 *   v3.0.0 (2026-05-24): 学会値(ACGIH/JSOH)は著作権リスク回避のため数値非収録。
 *     - 国の数値(MHLW_177)を最優先
 *     - 学会値は externalRefs.acgih.url / externalRefs.jsoh.url で公式参照のみ案内
 *
 * MHLW_177 拡張する場合は ETL スクリプトに追記し、
 * `node scripts/etl/fetch-concentration-limits.mjs` を再実行する。
 * その後 `node scripts/etl/strip-society-values.mjs` で学会数値を再除去すること。
 */
function formatLimitValue(v?: LimitValue | { value: string; unit: string }): string | undefined {
  if (!v) return undefined;
  return `${v.value} ${v.unit}`;
}

// CAS 番号 → 管理濃度 / OEL / 健康影響 / GHS の補助テーブルは
// chemical/supplemental-info.ts へ分離（クライアント軽量化）。import 互換のため再輸出。
export { getSupplementalInfo } from "./chemical/supplemental-info";

function isPlaceholderName(name: string): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  return trimmed === "" || trimmed === "－" || trimmed === "-" || trimmed === "—";
}

function pickPrimaryName(candidates: string[]): string {
  const good = candidates.filter((n) => !isPlaceholderName(n));
  if (good.length === 0) return "（物質名不明）";
  // 最も長い（情報量が多そうな）名称
  return good.sort((a, b) => b.length - a.length)[0];
}

export function mergeByCas(entries: MhlwChemicalEntry[]): MergedChemical[] {
  const byCas = new Map<string, MhlwChemicalEntry[]>();
  const noCas: MhlwChemicalEntry[] = [];

  for (const e of entries) {
    if (e.cas) {
      const arr = byCas.get(e.cas) ?? [];
      arr.push(e);
      byCas.set(e.cas, arr);
    } else {
      noCas.push(e);
    }
  }

  const merged: MergedChemical[] = [];

  for (const [cas, arr] of byCas.entries()) {
    const names = Array.from(new Set(arr.map((e) => e.name).filter(Boolean)));
    const primary = pickPrimaryName(names);
    const flags = {
      carcinogenic: arr.some((e) => e.category === "carcinogenic"),
      concentration: arr.some((e) => e.category === "concentration"),
      skin: arr.some((e) => e.category === "skin"),
      label_sds: arr.some((e) => e.category === "label_sds"),
    };
    const appliedDates: Partial<Record<MhlwChemicalCategory, string>> = {};
    for (const e of arr) {
      if (e.appliedDate && !appliedDates[e.category]) {
        appliedDates[e.category] = e.appliedDate;
      }
    }
    const noteSet = new Set<string>();
    for (const e of arr) {
      for (const n of e.notes) {
        if (n && n.trim()) noteSet.add(n.trim());
      }
    }
    let details: MhlwChemicalDetails | undefined;
    for (const e of arr) {
      if (!e.details) continue;
      details = { ...(details ?? {}), ...e.details };
    }
    merged.push({
      cas,
      primaryName: primary,
      aliases: names.filter((n) => n !== primary && !isPlaceholderName(n)),
      flags,
      appliedDates,
      notes: Array.from(noteSet),
      details,
      entryCount: arr.length,
    });
  }

  // CAS を持たないエントリは、名称単位で集約
  const byName = new Map<string, MhlwChemicalEntry[]>();
  for (const e of noCas) {
    if (isPlaceholderName(e.name)) continue;
    const key = e.name.trim();
    const arr = byName.get(key) ?? [];
    arr.push(e);
    byName.set(key, arr);
  }
  for (const [name, arr] of byName.entries()) {
    const flags = {
      carcinogenic: arr.some((e) => e.category === "carcinogenic"),
      concentration: arr.some((e) => e.category === "concentration"),
      skin: arr.some((e) => e.category === "skin"),
      label_sds: arr.some((e) => e.category === "label_sds"),
    };
    const appliedDates: Partial<Record<MhlwChemicalCategory, string>> = {};
    for (const e of arr) {
      if (e.appliedDate && !appliedDates[e.category]) {
        appliedDates[e.category] = e.appliedDate;
      }
    }
    const noteSet = new Set<string>();
    for (const e of arr) {
      for (const n of e.notes) {
        if (n && n.trim()) noteSet.add(n.trim());
      }
    }
    let details: MhlwChemicalDetails | undefined;
    for (const e of arr) {
      if (!e.details) continue;
      details = { ...(details ?? {}), ...e.details };
    }
    merged.push({
      cas: null,
      primaryName: name,
      aliases: [],
      flags,
      appliedDates,
      notes: Array.from(noteSet),
      details,
      entryCount: arr.length,
    });
  }

  merged.sort((a, b) => {
    // まず CAS あり優先、その中で名称順
    if ((a.cas ? 0 : 1) !== (b.cas ? 0 : 1)) return a.cas ? -1 : 1;
    return a.primaryName.localeCompare(b.primaryName, "ja");
  });

  return merged;
}

// CAS・名称の正規化ヘルパーは chemical/cas-text-helpers.ts へ分離（クライアント軽量化）。
// 既存の import 互換のためここから再輸出する。
export { normalizeCas, normalizeText, casMatches } from "./chemical/cas-text-helpers";
import { normalizeCas, normalizeText, casMatches } from "./chemical/cas-text-helpers";

function determineTier(entry: ConcentrationLimitEntry | undefined): DataTier {
  if (!entry) return "none";
  const isMhlw =
    entry.twa?.source === "MHLW_177" ||
    entry.stel?.source === "MHLW_177" ||
    entry.ceiling?.source === "MHLW_177";
  if (isMhlw) return "mhlw_177";
  if (entry.externalRefs?.acgih || entry.externalRefs?.jsoh) return "external_only";
  return "reference";
}

function applyConcentrationOverrides(merged: MergedChemical[]): MergedChemical[] {
  const handledCas = new Set<string>();

  for (const m of merged) {
    if (!m.cas) continue;
    const entry = CONCENTRATION_LIMITS.substances[m.cas];
    if (!entry) {
      m.details = { ...(m.details ?? {}), tier: "none" };
      continue;
    }
    handledCas.add(m.cas);

    const tier = determineTier(entry);

    // tier が mhlw_177 の場合は flag を立て、limit8h/limitShort をテキストに反映
    if (tier === "mhlw_177") m.flags.concentration = true;

    const limit8h = formatLimitValue(entry.twa);
    const limitShort = formatLimitValue(entry.stel) ?? formatLimitValue(entry.ceiling);

    m.details = {
      ...(m.details ?? {}),
      ...(limit8h ? { limit8h } : {}),
      ...(limitShort ? { limitShort } : {}),
      limits: entry,
      tier,
    };

    // IARC 発がん性が記録されていれば flags.carcinogenic を立てる
    if (entry.carcinogenicity?.iarc && /^(1|2A)$/.test(entry.carcinogenicity.iarc)) {
      m.flags.carcinogenic = true;
    }
  }

  // concentration-limits.json にしか存在しない CAS（拡張データセット由来）は
  // 新規 MergedChemical として追加し、UI に表示できるようにする。
  for (const [cas, entry] of Object.entries(CONCENTRATION_LIMITS.substances)) {
    if (handledCas.has(cas)) continue;
    if (!/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(cas)) continue;
    const tier = determineTier(entry);
    const isMhlw = tier === "mhlw_177";
    const isCarc = !!entry.carcinogenicity?.iarc && /^(1|2A)$/.test(entry.carcinogenicity.iarc);
    const limit8h = formatLimitValue(entry.twa);
    const limitShort = formatLimitValue(entry.stel) ?? formatLimitValue(entry.ceiling);
    const aliases = entry.nameEn ? [entry.nameEn] : [];
    merged.push({
      cas,
      primaryName: entry.name ?? `CAS ${cas}`,
      aliases,
      flags: {
        carcinogenic: isCarc,
        concentration: isMhlw,
        skin: false,
        label_sds: false,
      },
      appliedDates: {},
      notes: entry.notes ?? [],
      details: {
        ...(limit8h ? { limit8h } : {}),
        ...(limitShort ? { limitShort } : {}),
        limits: entry,
        tier,
      },
      entryCount: 0,
    });
  }

  return merged;
}

let _mergedCache: MergedChemical[] | null = null;
/** CAS 統合済みの全物質。クライアント側でキャッシュ。 */
export function getAllMergedChemicals(): MergedChemical[] {
  if (!_mergedCache) {
    _mergedCache = applyConcentrationOverrides(mergeByCas(rawCompact.entries));
    // concentration-limits 由来の追加分も含めた全体を決定的な順序に揃える
    // （スリム索引 mhlw-chemicals-slim.ts と同順＝検索の同点タイブレークまで一致させる）
    _mergedCache.sort((a, b) => {
      if ((a.cas ? 0 : 1) !== (b.cas ? 0 : 1)) return a.cas ? -1 : 1;
      return a.primaryName.localeCompare(b.primaryName, "ja");
    });
  }
  return _mergedCache;
}

/** UI 表示用: CAS 統合後の物質件数（単一の真実の源泉） */
export const MHLW_MERGED_CHEMICAL_COUNT: number = getAllMergedChemicals().length;

/** 物質名 / CAS / 別名でフリーワード検索（先頭 limit 件）。 */
export function searchMergedChemicals(
  query: string,
  limit = 30
): MergedChemical[] {
  const all = getAllMergedChemicals();
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
      const an = normalizeText(a);
      if (an.includes(qNorm)) {
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
export function findByCas(cas: string): MergedChemical | undefined {
  const target = normalizeCas(cas);
  if (!target) return undefined;
  return getAllMergedChemicals().find(
    (m) => m.cas && normalizeCas(m.cas) === target
  );
}
