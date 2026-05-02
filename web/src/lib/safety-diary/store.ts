"use client";

import { safetyDiaryEntrySchema, type SafetyDiaryEntry } from "./schema";

const STORAGE_KEY = "safety-diary-v3";

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

/** 全エントリを保存 */
function saveAll(entries: SafetyDiaryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
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
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
