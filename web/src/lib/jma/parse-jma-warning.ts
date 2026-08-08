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

export function isActiveWarningStatus(status: string | undefined): boolean {
  if (!status) return false;
  if (status.includes("発表警報・注意報はなし") || status === "なし") return false;
  if (status.includes("解除")) return false;
  // 新体系の「警報から注意報」は、注意報としては引き続き発表中。
  return (
    status === "発表" ||
    status === "継続" ||
    status.includes("警報から注意報")
  );
}

function levelFromCode(code: string | undefined): JmaMapLevel | null {
  if (!code || code.length === 0) return null;
  // 2026年の新体系と旧体系の双方を明示的に扱う。未知コードを
  // 「注意報らしい」と推測せず null にして未確認へ倒す。
  const specialCodes = new Set(["32", "33", "35", "36", "38"]);
  const warningCodes = new Set([
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "43",
    "44",
    "45",
    "46",
    "48",
    "49",
  ]);
  const advisoryCodes = new Set([
    "10",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
  ]);
  if (specialCodes.has(code)) return "special";
  if (warningCodes.has(code)) return "warning";
  if (advisoryCodes.has(code)) return "advisory";
  return null;
}

/** 気象庁コードの警報/注意報/特別警報区分（先頭桁）を公開版として提供 */
export function levelFromWarningCode(code: string | undefined): JmaMapLevel | null {
  return levelFromCode(code);
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

/**
 * 市区町村コード一致で抽出した selectedWarnings（{code,status}[]）から最大区分を算出。
 * サイネージの警報バナー判定は県単位の headlineText ではなく、この市区町村コード
 * ベースの区分を主軸にする（離島の注意報などで現場と無関係に赤くなるのを防ぐ）。
 */
export function maxLevelFromSelectedWarnings(
  warnings: ReadonlyArray<{ code: string; status?: string }>
): JmaMapLevel {
  let out: JmaMapLevel = "none";
  for (const w of warnings) {
    if (w.status !== undefined && !isActiveWarningStatus(w.status)) continue;
    if (w.status?.includes("警報から注意報")) {
      out = maxLevel(out, "advisory");
      continue;
    }
    const lv = levelFromCode(w.code);
    if (lv) out = maxLevel(out, lv);
  }
  return out;
}

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

export type JmaWarningPayloadSummary = {
  level: JmaMapLevel;
  headline: string | null;
  reportDatetime: string | null;
  publishingOffice: string | null;
  warnings: Array<{
    areaCode: string | null;
    code: string | null;
    status: string | null;
    level: JmaMapLevel | null;
  }>;
};

/** 1ファイル分を /api/signage/jma の JmaWarningEntry 形へ要約（サイネージ地図の全項目表示用） */
export function summarizeWarningPayload(payload: JmaWarningPayload): JmaWarningPayloadSummary {
  let level: JmaMapLevel = "none";
  const warnings: JmaWarningPayloadSummary["warnings"] = [];
  for (const t of payload.areaTypes ?? []) {
    for (const area of t.areas ?? []) {
      for (const w of area.warnings ?? []) {
        if (!isActiveWarningStatus(w.status)) continue;
        const lv = levelFromCode(w.code);
        if (lv) level = maxLevel(level, lv);
        warnings.push({
          areaCode: area.code ?? null,
          code: w.code ?? null,
          status: w.status ?? null,
          level: lv,
        });
      }
    }
  }
  return {
    level,
    headline: headlineFromPayload(payload),
    reportDatetime: payload.reportDatetime ?? null,
    publishingOffice: payload.publishingOffice ?? null,
    warnings,
  };
}
