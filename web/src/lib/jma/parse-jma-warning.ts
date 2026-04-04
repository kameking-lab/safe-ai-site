/** 気象庁 bosai warning JSON から都道府県塗り分け用の最大レベルを算出 */

export type JmaMapLevel = "none" | "advisory" | "warning" | "special";

type JmaWarningItem = {
  code?: string;
  status?: string;
};

type JmaArea = {
  code?: string;
  warnings?: JmaWarningItem[];
};

type JmaAreaType = {
  areas?: JmaArea[];
};

export type JmaWarningPayload = {
  reportDatetime?: string;
  headlineText?: string;
  publishingOffice?: string;
  areaTypes?: JmaAreaType[];
};

function isActiveWarningStatus(status: string | undefined): boolean {
  if (!status) return false;
  if (status.includes("なし")) return false;
  if (status.includes("解除")) return false;
  return status === "発表" || status === "継続";
}

function levelFromCode(code: string | undefined): JmaMapLevel | null {
  if (!code || code.length === 0) return null;
  const head = code[0]!;
  if (head === "3") return "special";
  if (head === "0") return "warning";
  if (head === "1" || head === "2") return "advisory";
  return "advisory";
}

const rank: Record<JmaMapLevel, number> = {
  none: 0,
  advisory: 1,
  warning: 2,
  special: 3,
};

function maxLevel(a: JmaMapLevel, b: JmaMapLevel): JmaMapLevel {
  return rank[a] >= rank[b] ? a : b;
}

/** 1ファイル分（細分区域・市区町村をまとめて）の最大レベル */
export function maxLevelFromWarningPayload(payload: JmaWarningPayload): JmaMapLevel {
  let out: JmaMapLevel = "none";
  const types = payload.areaTypes ?? [];
  for (const t of types) {
    for (const area of t.areas ?? []) {
      for (const w of area.warnings ?? []) {
        if (!isActiveWarningStatus(w.status)) continue;
        const lv = levelFromCode(w.code);
        if (lv) out = maxLevel(out, lv);
      }
    }
  }
  return out;
}

/** 複数エリア（北海道ブロック等）をマージ */
export function mergeJmaLevels(levels: JmaMapLevel[]): JmaMapLevel {
  return levels.reduce((a, b) => maxLevel(a, b), "none" as JmaMapLevel);
}

export type SelectedAreaWarning = {
  code: string;
  status: string;
  nameHint?: string;
};

/** 市区町村コード一致の注警報一覧（headline は別フィールドで返す） */
export function warningsForCityCode(payload: JmaWarningPayload, cityCode: string): SelectedAreaWarning[] {
  const out: SelectedAreaWarning[] = [];
  const types = payload.areaTypes ?? [];
  for (const t of types) {
    for (const area of t.areas ?? []) {
      if (area.code !== cityCode) continue;
      for (const w of area.warnings ?? []) {
        if (!w.code || !w.status) continue;
        if (!isActiveWarningStatus(w.status)) continue;
        out.push({ code: w.code, status: w.status });
      }
    }
  }
  return out;
}

export function headlineFromPayload(payload: JmaWarningPayload): string | null {
  const h = payload.headlineText?.trim();
  return h && h.length > 0 ? h : null;
}
