import compact from "@/data/chemicals-mhlw/compact.json";
import { chemicalSubstances } from "@/data/mock/chemical-substances-db";

export type MhlwChemicalCategory =
  | "carcinogenic"
  | "concentration"
  | "skin"
  | "label_sds"
  | "other";

export type MhlwChemicalDetails = {
  /** 八時間濃度基準値 (例: "20 ppm" / "5 ㎎/㎥") */
  limit8h?: string;
  /** 短時間濃度基準値 */
  limitShort?: string;
  /** モデル SDS の推奨用途 */
  uses?: string;
  /** 厚労省 公式 SDS PDF リンク */
  link?: string;
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
 * 厚生労働省告示第177号（化学物質の濃度基準値）に基づく主要物質の濃度基準値。
 * 当サイトの compact.json（自動抽出）では一部の基幹物質で濃度基準値カテゴリが
 * 欠落するため、基準値が確定している物質は CAS 番号ベースでここに明示する。
 * 出典: 厚生労働省 令和5年4月告示第177号（別表・追加告示含む）。
 */
type ConcentrationOverride = {
  /** 8時間濃度基準値（例: "1 ppm"） */
  limit8h: string;
  /** 短時間濃度基準値（例: "0.5 ppm"） */
  limitShort?: string;
  /** 告示番号・根拠 */
  source?: string;
};

const CONCENTRATION_OVERRIDES_BY_CAS: Record<string, ConcentrationOverride> = {
  // ベンゼン — 告示第177号
  "71-43-2": { limit8h: "1 ppm", limitShort: "0.5 ppm", source: "告示第177号" },
  // トルエン — 告示第177号
  "108-88-3": { limit8h: "20 ppm", source: "告示第177号" },
};

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
  for (const m of merged) {
    if (!m.cas) continue;
    const override = CONCENTRATION_OVERRIDES_BY_CAS[m.cas];
    if (!override) continue;
    m.flags.concentration = true;
    m.details = {
      ...(m.details ?? {}),
      limit8h: override.limit8h,
      ...(override.limitShort ? { limitShort: override.limitShort } : {}),
    };
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
