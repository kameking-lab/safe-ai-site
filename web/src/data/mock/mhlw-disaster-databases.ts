import {
  generateMhlwDeathRecords,
  generateMhlwLostTimeRecords,
  MHLW_DISASTER_FORM_TYPES,
  type MhlwDisasterRecord,
} from "@/data/mock/mhlw-disaster-generate";

export type { MhlwDisasterRecord };

/** 災害の「形態」20型（フィルタ用・厚労省公表区分のイメージ） */
export { MHLW_DISASTER_FORM_TYPES };

const YEAR_MIN = 2021;
const YEAR_MAX = 2025;

let cachedDeath: MhlwDisasterRecord[] | null = null;
let cachedLost: MhlwDisasterRecord[] | null = null;

/** 直近5年・死亡災害のみで約4000件規模のモック（実Excel差し替え前提） */
export function getMhlwDeathDisastersMock(): MhlwDisasterRecord[] {
  if (!cachedDeath) {
    cachedDeath = generateMhlwDeathRecords(4000, 202604041).filter((r) => {
      const y = Number(r.occurredOn.slice(0, 4));
      return y >= YEAR_MIN && y <= YEAR_MAX;
    });
  }
  return cachedDeath;
}

/** 休業4日以上相当の休業災害モック */
export function getMhlwLostTimeDisastersMock(): MhlwDisasterRecord[] {
  if (!cachedLost) {
    cachedLost = generateMhlwLostTimeRecords(2800, 202604042).filter((r) => {
      const y = Number(r.occurredOn.slice(0, 4));
      return y >= YEAR_MIN && y <= YEAR_MAX;
    });
  }
  return cachedLost;
}

/** @deprecated 互換: 関数版を使用してください */
export const mhlwDeathDisastersMock = getMhlwDeathDisastersMock();
export const mhlwLostTimeDisastersMock = getMhlwLostTimeDisastersMock();

function tokenizeQuery(q: string): string[] {
  const t = q.trim();
  if (!t) return [];
  return t.split(/[\s　,、]+/).filter(Boolean);
}

function scoreRecord(r: MhlwDisasterRecord, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let s = 0;
  const titleL = r.title.toLowerCase();
  const sumL = r.summary.toLowerCase();
  const indL = r.industry.toLowerCase();
  const typeL = r.accidentType.toLowerCase();
  for (const raw of tokens) {
    const tl = raw.toLowerCase();
    if (!tl) continue;
    if (titleL.includes(tl)) s += 100;
    if (typeL.includes(tl)) s += 70;
    if (sumL.includes(tl)) s += 55;
    if (indL.includes(tl)) s += 40;
    for (const k of r.keywords) {
      if (k.toLowerCase().includes(tl)) s += 45;
    }
    const blob = `${titleL} ${sumL} ${indL} ${typeL} ${r.keywords.join(" ").toLowerCase()}`;
    if (blob.includes(tl)) s += 12;
  }
  return s;
}

export type MhlwDisasterSearchOptions = {
  query: string;
  /** 災害型20型のいずれか、または空で全件 */
  accidentType?: string;
  /** 西暦4桁、空で全期間（データは2021–2025） */
  year?: string;
  tab: "死亡災害" | "休業災害";
};

/**
 * あいまい・複合キーワードに対しスコアで並べ替え（関連度の高い順）。
 * クエリ空のときは日付の新しい順。
 */
export function searchMhlwDisastersRanked(opts: MhlwDisasterSearchOptions): MhlwDisasterRecord[] {
  const death = getMhlwDeathDisastersMock();
  const lost = getMhlwLostTimeDisastersMock();
  let list = opts.tab === "死亡災害" ? death : lost;

  if (opts.accidentType) {
    list = list.filter((r) => r.accidentType === opts.accidentType);
  }
  const yf = opts.year;
  if (yf) {
    list = list.filter((r) => r.occurredOn.startsWith(yf));
  }

  const tokens = tokenizeQuery(opts.query);
  if (tokens.length === 0) {
    return [...list].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  }

  const scored = list
    .map((r) => ({ r, score: scoreRecord(r, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.r.occurredOn.localeCompare(a.r.occurredOn);
    });
  return scored.map((x) => x.r);
}

/** 従来API互換（部分一致・日付順のみ） */
export function searchMhlwDisasters(
  query: string,
  death = getMhlwDeathDisastersMock(),
  lost = getMhlwLostTimeDisastersMock()
): { death: MhlwDisasterRecord[]; lostTime: MhlwDisasterRecord[] } {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { death, lostTime: lost };
  }
  const match = (r: MhlwDisasterRecord) =>
    r.title.toLowerCase().includes(q) ||
    r.summary.toLowerCase().includes(q) ||
    r.industry.toLowerCase().includes(q) ||
    r.accidentType.toLowerCase().includes(q) ||
    r.keywords.some((k) => k.toLowerCase().includes(q));
  return {
    death: death.filter(match),
    lostTime: lost.filter(match),
  };
}
