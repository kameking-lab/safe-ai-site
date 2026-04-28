/**
 * UGCストア
 * - サーバー側はメモリ + 同梱されたサンプルデータ（モック）
 * - クライアント側は localStorage に追加投稿を保持して、
 *   サンプルとマージして表示する想定。
 * 将来Supabase等のDBに差し替え可能なよう、関数を切り出している。
 */

import { COMMUNITY_CASES_SEED } from "@/data/mock/community-cases";
import type { UgcSubmission } from "./ugc-types";

const LOCAL_STORAGE_KEY = "anzen-ugc-submissions-v1";

// ──────────────── サーバー側（インメモリ） ────────────────
const serverStore: UgcSubmission[] = [...COMMUNITY_CASES_SEED];

export function serverAddSubmission(s: UgcSubmission): void {
  serverStore.unshift(s);
}

export function serverListSubmissions(): UgcSubmission[] {
  return [...serverStore];
}

// ──────────────── クライアント側（localStorage） ────────────────

function safeReadLocal(): UgcSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UgcSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLocal(items: UgcSubmission[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* noop */
  }
}

export function clientAddSubmission(s: UgcSubmission): void {
  const items = safeReadLocal();
  items.unshift(s);
  safeWriteLocal(items.slice(0, 200)); // 上限
}

export function clientListSubmissions(): UgcSubmission[] {
  return safeReadLocal();
}

export function clientUpdateStatus(id: string, status: UgcSubmission["status"]): void {
  const items = safeReadLocal();
  const next = items.map((s) => (s.id === id ? { ...s, status } : s));
  safeWriteLocal(next);
}

/** seed + クライアント追加分のマージ。重複は id でユニーク化。 */
export function getMergedSubmissions(): UgcSubmission[] {
  const local = safeReadLocal();
  const map = new Map<string, UgcSubmission>();
  for (const s of [...local, ...COMMUNITY_CASES_SEED]) {
    if (!map.has(s.id)) map.set(s.id, s);
  }
  return Array.from(map.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function findSubmissionById(id: string): UgcSubmission | undefined {
  return getMergedSubmissions().find((s) => s.id === id);
}

export function generateSubmissionId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `ugc-${ts}-${rand}`;
}

export function generateAuthorAlias(): string {
  const animals = [
    "コアラ",
    "カピバラ",
    "ペンギン",
    "ハリネズミ",
    "リス",
    "シマエナガ",
    "アライグマ",
    "アルパカ",
    "フクロウ",
    "クロネコ",
  ];
  const num = Math.floor(Math.random() * 9000) + 1000;
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `匿名の${animal}#${num}`;
}
