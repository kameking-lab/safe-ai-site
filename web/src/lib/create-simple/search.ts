/**
 * 公式物質リスト（3,417物質）の名前・CAS番号検索。純粋関数（データは呼び出し側が渡す）。
 */
import type { OfficialSubstanceRecord } from "./official";

const CAS_PATTERN = /^\d{2,7}-\d{2}-\d$/;

export function normalizeQuery(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s　・,，、()（）\[\]［］{}「」'"’”‐‑‒–—―ー−－-]/g, "");
}

function digitsOnly(text: string): string {
  return text.normalize("NFKC").replace(/[^0-9]/g, "");
}

export function isCasNumber(text: string): boolean {
  return CAS_PATTERN.test(text.normalize("NFKC").trim());
}

export interface SearchIndexEntry {
  record: OfficialSubstanceRecord;
  key: string;
  casDigits: string;
}

export function buildSearchIndex(records: OfficialSubstanceRecord[]): SearchIndexEntry[] {
  return records.map((record) => ({
    record,
    key: normalizeQuery(`${record[1]}${record[2]}`),
    casDigits: digitsOnly(record[0]),
  }));
}

export function searchSubstances(index: SearchIndexEntry[], query: string, limit = 8): OfficialSubstanceRecord[] {
  const raw = query.trim();
  if (!raw) return [];
  const q = normalizeQuery(raw);
  const qDigits = digitsOnly(raw);
  const casLike = /^[\d\s\-－‐ー]+$/.test(raw.normalize("NFKC"));
  const scored: Array<{ score: number; len: number; record: OfficialSubstanceRecord }> = [];
  for (const entry of index) {
    let score = 0;
    if (casLike && qDigits.length >= 2) {
      if (entry.casDigits === qDigits) score = 100;
      else if (entry.casDigits.startsWith(qDigits)) score = 60;
    }
    if (q && score === 0) {
      const name = normalizeQuery(entry.record[1]);
      if (name === q) score = 90;
      else if (name.startsWith(q)) score = 70;
      else if (entry.key.includes(q)) score = 40;
    }
    if (score > 0) scored.push({ score, len: entry.record[1].length, record: entry.record });
  }
  scored.sort((a, b) => b.score - a.score || a.len - b.len);
  return scored.slice(0, limit).map((s) => s.record);
}
