import compact from "@/data/chemicals-mhlw/compact.json";
import concentrationLimitsRaw from "@/data/concentration-limits.json";
import { chemicalSubstances } from "@/data/mock/chemical-substances-db";

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

/** 主要出典の判定ラベル */
export type LimitSource = "mhlw" | "jsoh" | "acgih" | "reference";

/** IARC 発がん性分類 */
export type IarcGroup = "1" | "2A" | "2B" | "3";

/** 物質単位の濃度・発がん性データ（concentration-limits.json） */
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
    source?: string;
  };
  jsoh?: {
    twa?: { value: string; unit: string };
    stel?: { value: string; unit: string };
    ceiling?: { value: string; unit: string };
  };
  acgih?: {
    twa?: { value: string; unit: string };
    stel?: { value: string; unit: string };
    ceiling?: { value: string; unit: string };
  };
  mhlwSdsUrl?: string;
  notes?: string[];
  /** v2: 主要出典の判定（mhlw > jsoh > acgih > reference） */
  source?: LimitSource;
  /** v2: IARC 分類のフラット参照 */
  iarcGroup?: IarcGroup | null;
  /** v2: JSOH TWA 数値（フィルタ・ソート用） */
  jsohOel?: { value: number; unit: string } | null;
  /** v2: ACGIH TLV-TWA 数値（フィルタ・ソート用） */
  acgihTlv?: { value: number; unit: string } | null;
};

type ConcentrationLimitsFile = {
  generatedAt: string;
  version: string;
  sources: Record<string, string>;
  summary: {
    total: number;
    withMhlw: number;
    withIarc: number;
    withJsoh: number;
    withAcgih: number;
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
  /** データの優先度: 厚労省告示 > 産業衛生学会 > ACGIH > 参考値 */
  tier?: "mhlw_177" | "jsoh" | "acgih" | "reference" | "none";
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

export const CATEGORY_LABELS_JA: Record<MhlwChemicalCategory, string> = {
  carcinogenic: "がん原性物質",
  concentration: "濃度基準値",
  skin: "皮膚等障害",
  label_sds: "SDS交付義務",
  other: "その他",
};

export const CATEGORY_BADGE: Record<MhlwChemicalCategory, string> = {
  carcinogenic: "bg-rose-100 text-rose-800 border-rose-200",
  concentration: "bg-amber-100 text-amber-800 border-amber-200",
  skin: "bg-blue-100 text-blue-800 border-blue-200",
  label_sds: "bg-emerald-100 text-emerald-800 border-emerald-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

/** カテゴリ → 関連法令の概要 */
export const CATEGORY_TO_LAW: Record<MhlwChemicalCategory, string> = {
  label_sds: "労働安全衛生法 第57条・第57条の2（ラベル表示・SDS交付義務）",
  concentration: "労働安全衛生規則 第577条の2（濃度基準値）",
  skin: "労働安全衛生規則 第594条の2・第594条の3（皮膚等障害化学物質等）",
  carcinogenic: "労働安全衛生規則 第577条の2 第3項（がん原性物質 記録30年保存）",
  other: "",
};

export const rawCompact = compact as unknown as MhlwChemicalCompact;

export const MHLW_CHEMICALS_SOURCE =
  "厚生労働省 皮膚等障害化学物質リスト・SDS交付義務物質一覧・がん原性物質一覧・濃度基準値設定物質";

/**
 * 濃度基準値・許容濃度・発がん性分類は scripts/etl/fetch-concentration-limits.mjs で
 * 生成された web/src/data/concentration-limits.json を出典とする。
 *
 *   優先度: 厚労省告示第177号 > 産業衛生学会許容濃度 > ACGIH > 参考値
 *
 * 拡張する場合は ETL スクリプトの CARCINOGENS_IARC / JSOH_LIMITS / ACGIH_LIMITS /
 * MHLW_177_OVERRIDES マップに追記し、`node scripts/etl/fetch-concentration-limits.mjs`
 * を再実行する。
 */
function formatLimitValue(v?: LimitValue | { value: string; unit: string }): string | undefined {
  if (!v) return undefined;
  return `${v.value} ${v.unit}`;
}

/** UI 表示用ラベル: 出典タグ → 短縮ラベル */
export const SOURCE_LABEL: Record<string, string> = {
  MHLW_177: "厚労告示第177号",
  JSOH: "産業衛生学会",
  ACGIH: "ACGIH",
  IARC: "IARC",
  GHS_MHLW: "国GHS分類",
};

/** UI 表示用バッジ色 */
export const SOURCE_BADGE: Record<string, string> = {
  MHLW_177: "bg-amber-100 text-amber-900 border-amber-200",
  JSOH: "bg-violet-100 text-violet-900 border-violet-200",
  ACGIH: "bg-sky-100 text-sky-900 border-sky-200",
  IARC: "bg-rose-100 text-rose-900 border-rose-200",
  GHS_MHLW: "bg-emerald-100 text-emerald-900 border-emerald-200",
};

/** v2: フラット source フィールド用ラベル */
export const PRIMARY_SOURCE_LABEL: Record<LimitSource, string> = {
  mhlw: "公式（厚労告示）",
  jsoh: "学会（産衛）",
  acgih: "参考（ACGIH）",
  reference: "参考値",
};

/** v2: フラット source フィールド用バッジ色 */
export const PRIMARY_SOURCE_BADGE: Record<LimitSource, string> = {
  mhlw: "bg-amber-100 text-amber-900 border-amber-300",
  jsoh: "bg-violet-100 text-violet-900 border-violet-300",
  acgih: "bg-sky-100 text-sky-900 border-sky-300",
  reference: "bg-slate-100 text-slate-700 border-slate-200",
};

/** v2: IARC 分類の表示色 */
export const IARC_BADGE: Record<IarcGroup, string> = {
  "1": "bg-rose-200 text-rose-900 border-rose-300",
  "2A": "bg-orange-100 text-orange-900 border-orange-300",
  "2B": "bg-amber-100 text-amber-800 border-amber-200",
  "3": "bg-slate-100 text-slate-700 border-slate-200",
};

/** v2: IARC 分類のラベル */
export const IARC_LABEL: Record<IarcGroup, string> = {
  "1": "Group 1（発がん性あり）",
  "2A": "Group 2A（おそらく発がん性）",
  "2B": "Group 2B（発がん性の可能性）",
  "3": "Group 3（分類できない）",
};

/** データ階層バッジ: 「濃度基準値あり」「許容濃度のみ」「参考値のみ」 */
export type DataTier = "mhlw_177" | "jsoh" | "acgih" | "reference" | "none";

export const TIER_LABEL: Record<DataTier, string> = {
  mhlw_177: "濃度基準値あり",
  jsoh: "許容濃度のみ",
  acgih: "参考値のみ",
  reference: "参考値",
  none: "数値データなし",
};

export const TIER_BADGE: Record<DataTier, string> = {
  mhlw_177: "bg-amber-100 text-amber-900 border-amber-300",
  jsoh: "bg-violet-100 text-violet-900 border-violet-300",
  acgih: "bg-sky-100 text-sky-900 border-sky-300",
  reference: "bg-slate-100 text-slate-700 border-slate-200",
  none: "bg-slate-50 text-slate-400 border-slate-100",
};

function determineTier(entry: ConcentrationLimitEntry | undefined): DataTier {
  if (!entry) return "none";
  const isMhlw =
    entry.twa?.source === "MHLW_177" ||
    entry.stel?.source === "MHLW_177" ||
    entry.ceiling?.source === "MHLW_177";
  if (isMhlw) return "mhlw_177";
  if (entry.jsoh) return "jsoh";
  if (entry.acgih) return "acgih";
  return "reference";
}

/** 管理濃度（作業環境評価基準告示）と濃度基準値は別物である旨の説明ラベル */
export const MANAGEMENT_VS_LIMIT_DISCLAIMER =
  "※ 「濃度基準値」（安衛則577条の2・告示第177号）と「管理濃度」（作業環境評価基準）は別の指標です。両者の数値が一致する物質もあれば、異なる物質もあります。";

/**
 * CAS 番号 → 管理濃度 / OEL / 健康影響 / GHS の補助テーブル。
 * 厚労省「濃度基準値」には未掲載だが特化則・有機則で管理濃度が定められている
 * 代表物質をカバーするため、chemical-substances-db.ts のデータを CAS 索引化する。
 */
const supplementalByCas = new Map<
  string,
  {
    oel?: string;
    healthEffects?: string;
    ghs?: string[];
    carcinogenic: boolean;
  }
>();
for (const c of chemicalSubstances) {
  if (!/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(c.cas)) continue;
  const carcinogenic =
    (c.ghs ?? []).some((g) => /発がん性1[AB]?/.test(g)) ||
    /発がん|がん|胆管がん|白血病/.test(c.health_effects);
  supplementalByCas.set(c.cas, {
    oel: c.oel,
    healthEffects: c.health_effects,
    ghs: c.ghs,
    carcinogenic,
  });
}

export function getSupplementalInfo(cas: string | null | undefined) {
  if (!cas) return undefined;
  return supplementalByCas.get(cas);
}

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

/** CAS 番号の軽いノーマライズ（空白除去・全角→半角） */
export function normalizeCas(v: string): string {
  return v
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s\u3000]/g, "")
    .trim();
}

/** CAS / 名称 / 備考を対象にしたノーマライズ */
export function normalizeText(v: string): string {
  return v.toLowerCase().replace(/\s+/g, "");
}

/** CAS の柔軟マッチ: ハイフンを外した比較・前方一致・部分一致 */
export function casMatches(query: string, cas: string | null): boolean {
  if (!cas) return false;
  const q = normalizeCas(query);
  if (!q) return true;
  const nc = normalizeCas(cas);
  if (nc.includes(q)) return true;
  // ハイフン無しで比較
  return nc.replace(/-/g, "").includes(q.replace(/-/g, ""));
}

/** カテゴリフラグ → 規制区分のラベル（推定） */
export function regulatoryLabels(flags: MergedChemical["flags"]): string[] {
  const out: string[] = [];
  if (flags.label_sds) out.push("リスクアセスメント対象物（SDS交付義務）");
  if (flags.concentration) out.push("濃度基準値設定物質（自律的管理）");
  if (flags.carcinogenic) out.push("がん原性物質（記録30年保存）");
  if (flags.skin) out.push("皮膚等障害化学物質（不浸透性保護具必要）");
  return out;
}

/** カテゴリフラグ → 関連法令の文字列 */
export function relatedLawTexts(flags: MergedChemical["flags"]): string[] {
  const out: string[] = [];
  if (flags.label_sds) out.push(CATEGORY_TO_LAW.label_sds);
  if (flags.concentration) out.push(CATEGORY_TO_LAW.concentration);
  if (flags.carcinogenic) out.push(CATEGORY_TO_LAW.carcinogenic);
  if (flags.skin) out.push(CATEGORY_TO_LAW.skin);
  return out.filter(Boolean);
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
