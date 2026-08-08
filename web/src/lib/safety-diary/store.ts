"use client";

import { safetyDiaryEntrySchema, type SafetyDiaryEntry } from "./schema";

const STORAGE_KEY = "safety-diary-v3";

// localStorage 肥大化対策: 1 年分（365エントリ）を上限とする。
// 1 エントリあたり ~2KB の前提で 365 件 ≒ 730KB（localStorage 上限の 1/7 程度）。
export const MAX_DIARY_ENTRIES = 365;

/** エントリ配列を localStorage 上限ポリシーに従って切り詰める（純粋関数） */
export function capEntries(entries: SafetyDiaryEntry[]): SafetyDiaryEntry[] {
  // updatedAt 降順で並び替えて先頭 MAX_DIARY_ENTRIES 件を保持
  const sorted = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return sorted.slice(0, MAX_DIARY_ENTRIES);
}

/** localStorage から全エントリを読む */
export function loadEntries(): SafetyDiaryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const json = JSON.parse(raw);
    if (!Array.isArray(json)) return [];
    return json
      .map((e) => {
        const parsed = safetyDiaryEntrySchema.safeParse(e);
        return parsed.success ? parsed.data : null;
      })
      .filter((e): e is SafetyDiaryEntry => e !== null);
  } catch {
    return [];
  }
}

/** 全エントリを保存（保存時に上限ポリシーを適用） */
function saveAll(entries: SafetyDiaryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capEntries(entries)));
}

/** ID で取得 */
export function getEntryById(id: string): SafetyDiaryEntry | undefined {
  return loadEntries().find((e) => e.id === id);
}

/** 新規追加 */
export function addEntry(entry: SafetyDiaryEntry): void {
  const entries = loadEntries();
  entries.push(entry);
  saveAll(entries);
}

/** 更新 */
export function updateEntry(id: string, partial: Partial<SafetyDiaryEntry>): void {
  const entries = loadEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return;
  entries[idx] = {
    ...entries[idx],
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  saveAll(entries);
}

/** 削除 */
export function deleteEntry(id: string): void {
  const entries = loadEntries().filter((e) => e.id !== id);
  saveAll(entries);
}

/** 月（YYYY-MM）でフィルタ */
export function getEntriesByMonth(yearMonth: string): SafetyDiaryEntry[] {
  return loadEntries().filter((e) => e.required.date.startsWith(yearMonth));
}

/** UUID 生成（crypto.randomUUID 互換） */
export function newId(): string {
  const webCrypto: Partial<Crypto> | undefined = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    // 永続化レコードの識別子用途。暗号用途ではないが、schema互換のUUIDを必ず返す。
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}
