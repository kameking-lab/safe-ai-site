/** 気象庁 警報・注意報 JSON の府県予報区コード（例外のみ明示、他は JP-XX → XX0000） */

const SPECIAL_FETCH_CODES: Record<string, string[]> = {
  "JP-01": ["011000", "012000", "013000", "015000", "016000", "017000"],
  "JP-46": ["460040", "460100"],
  "JP-47": ["471000", "472000", "473000", "474000"],
};

export function jmaWarningJsonCodesForIso2(iso3166_2: string): string[] {
  if (SPECIAL_FETCH_CODES[iso3166_2]) {
    return SPECIAL_FETCH_CODES[iso3166_2]!;
  }
  const num = Number.parseInt(iso3166_2.slice(3), 10);
  if (!Number.isFinite(num) || num < 1 || num > 47) {
    return [];
  }
  return [`${String(num).padStart(2, "0")}0000`];
}

export function jmaWarningJsonUrl(code: string) {
  return `https://www.jma.go.jp/bosai/warning/data/warning/${code}.json`;
}
