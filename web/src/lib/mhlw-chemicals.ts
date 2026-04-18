import compact from "@/data/chemicals-mhlw/compact.json";

export type MhlwChemicalCategory =
  | "carcinogenic"
  | "concentration"
  | "skin"
  | "label_sds"
  | "other";

export type MhlwChemicalEntry = {
  name: string;
  cas: string | null;
  category: MhlwChemicalCategory;
  categoryLabel: string;
  appliedDate: string | null;
  notes: string[];
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

function isPlaceholderName(name: string): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  return trimmed === "" || trimmed === "－" || trimmed === "-" || trimmed === "—";
}

function pickPrimaryName(candidates: string[]): string {
  const good = candidates.filter((n) => !isPlaceholderName(n));
  if (good.length === 0) return candidates[0] ?? "（名称不明）";
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
    merged.push({
      cas,
      primaryName: primary,
      aliases: names.filter((n) => n !== primary && !isPlaceholderName(n)),
      flags,
      appliedDates,
      notes: Array.from(noteSet),
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
    merged.push({
      cas: null,
      primaryName: name,
      aliases: [],
      flags,
      appliedDates,
      notes: Array.from(noteSet),
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
