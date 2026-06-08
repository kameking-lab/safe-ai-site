/**
 * URL-sync helpers for carrying the石綿 project scope between the two linked
 * tools in `/asbestos-management`:
 *
 *   Step 1  事前調査・報告義務 判定ツール  (investigation-checker)
 *      │  「届出書類リストを作成 →」
 *      ▼
 *   Step 2  届出書類リスト 自動生成        (notification-builder)
 *
 * Without this, Step 2 always opened with its own hard-coded defaults and the
 * contractor had to re-key the same 5–6 fields they just entered in Step 1
 * (建物用途 / 工事種別 / 着工年 / 請負金額 / 床面積 / 石綿レベル). These pure
 * functions serialise the form values into a compact query string and parse
 * them back with validation, so a malformed / hand-edited URL never crashes
 * the page — unknown values fall back to the caller-supplied defaults.
 *
 * Mirrors the established pattern in `@/lib/court-cases/search`
 * (`courtFilterToQuery` / `courtFilterFromParams`).
 */

import {
  ASBESTOS_WORK_LEVEL_LABELS_JA,
  BUILDING_CATEGORY_LABELS_JA,
  PROJECT_CATEGORY_LABELS_JA,
  type AsbestosWorkLevel,
  type BuildingCategory,
  type ProjectCategory,
} from "@/types/asbestos";

/** Form-level shape shared by both tools (contract is in 万円, matching the UI). */
export interface AsbestosScopeFormValues {
  buildingCategory: BuildingCategory;
  projectCategory: ProjectCategory;
  /** 着工年（西暦4桁）。 */
  constructionStartYear: number;
  /** 請負金額（万円・税込）。 */
  contractValueJpyMan: number;
  /** 対象床面積（m²）。 */
  workAreaSqm: number;
  /** 事前情報で石綿含有が判明しているか。 */
  asbestosKnownPresent: boolean;
  /** 石綿レベル（未確定は空文字）。 */
  workLevel: AsbestosWorkLevel | "";
}

const BUILDING_VALUES = Object.keys(
  BUILDING_CATEGORY_LABELS_JA,
) as BuildingCategory[];
const PROJECT_VALUES = Object.keys(
  PROJECT_CATEGORY_LABELS_JA,
) as ProjectCategory[];
const LEVEL_VALUES = Object.keys(
  ASBESTOS_WORK_LEVEL_LABELS_JA,
) as AsbestosWorkLevel[];

// 着工年・金額・面積の妥当域。範囲外は丸め、非数は呼び出し側の既定値へ。
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const MAN_MAX = 100_000_000; // 1兆円（事実上の上限・暴走防止）
const AREA_MAX = 10_000_000;

function parseBoundedInt(
  raw: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Serialise scope form values into a `URLSearchParams` string. All scalar
 * fields are always emitted (they always have a concrete value); the boolean
 * `k` and the optional `l` (level) are emitted only when meaningful, to keep
 * the URL short.
 */
export function asbestosScopeToQuery(v: {
  buildingCategory: BuildingCategory;
  projectCategory: ProjectCategory;
  constructionStartYear: number;
  contractValueJpyMan: number;
  workAreaSqm: number;
  asbestosKnownPresent: boolean;
  workLevel?: AsbestosWorkLevel | "";
}): string {
  const params = new URLSearchParams();
  params.set("b", v.buildingCategory);
  params.set("p", v.projectCategory);
  params.set("y", String(v.constructionStartYear));
  params.set("c", String(v.contractValueJpyMan));
  params.set("a", String(v.workAreaSqm));
  if (v.asbestosKnownPresent) params.set("k", "1");
  if (v.workLevel) params.set("l", v.workLevel);
  return params.toString();
}

/**
 * True when the query carries at least one recognised scope key — lets the UI
 * show a "前ステップの条件を引き継ぎました" hint only when it actually did.
 */
export function hasAsbestosScopeParams(
  get: (key: string) => string | null | undefined,
): boolean {
  return ["b", "p", "y", "c", "a", "k", "l"].some((k) => {
    const val = get(k);
    return val != null && val.trim() !== "";
  });
}

/**
 * Parse a query (via a getter, so it works for both `URLSearchParams` on the
 * server and `useSearchParams()` on the client) into validated form values.
 * Unknown / malformed values fall back to `defaults` so a direct visit or a
 * hand-edited URL is always safe.
 */
export function asbestosScopeFromParams(
  get: (key: string) => string | null | undefined,
  defaults: AsbestosScopeFormValues,
): AsbestosScopeFormValues {
  const raw = (k: string) => (get(k) ?? "").trim();
  const b = raw("b");
  const p = raw("p");
  const l = raw("l");
  return {
    buildingCategory: BUILDING_VALUES.includes(b as BuildingCategory)
      ? (b as BuildingCategory)
      : defaults.buildingCategory,
    projectCategory: PROJECT_VALUES.includes(p as ProjectCategory)
      ? (p as ProjectCategory)
      : defaults.projectCategory,
    constructionStartYear: parseBoundedInt(
      raw("y"),
      YEAR_MIN,
      YEAR_MAX,
      defaults.constructionStartYear,
    ),
    contractValueJpyMan: parseBoundedInt(
      raw("c"),
      0,
      MAN_MAX,
      defaults.contractValueJpyMan,
    ),
    workAreaSqm: parseBoundedInt(raw("a"), 0, AREA_MAX, defaults.workAreaSqm),
    asbestosKnownPresent: raw("k") === "1",
    workLevel: LEVEL_VALUES.includes(l as AsbestosWorkLevel)
      ? (l as AsbestosWorkLevel)
      : defaults.workLevel,
  };
}
