/**
 * P1-5 化学物質RA結果のローカルファースト保管＋クラウド同期（client）。
 *
 * KY storage-adapter と同方針:
 *  - localStorage を常に真実の保存先とし、クラウド(/api/chemical/ra-records)へ背景同期する。
 *  - クラウド未設定・失敗でも保存・一覧は localStorage で機能する（壊れない）。
 *  - 端末ID(getDeviceId)はKYと共有。
 */
import { getDeviceId } from "@/lib/ky/storage-adapter";

const STORE_KEY = "safe-ai:chemical-ra-records:v1";

export interface ChemicalRaSavedRecord {
  raId: string;
  cas: string;
  substance: string;
  workContent: string;
  exposureBand: string;
  payload: unknown;
  savedAt: string;
}

/** クラウドを試すか（ブラウザ公開 Supabase URL の有無）。 */
export function isChemicalRaCloudEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
  );
}

// ── 純粋ヘルパー（テスト対象） ───────────────────────────────
/** raId 一意で upsert（同一raIdは新しい方で上書き）、savedAt 降順。 */
export function upsertRecord(
  list: readonly ChemicalRaSavedRecord[],
  rec: ChemicalRaSavedRecord
): ChemicalRaSavedRecord[] {
  const next = list.filter((r) => r.raId !== rec.raId);
  next.push(rec);
  next.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  return next;
}

/** クラウド一覧とローカル一覧を raId でマージ（同一は savedAt が新しい方を採用）、降順。 */
export function mergeRecords(
  local: readonly ChemicalRaSavedRecord[],
  cloud: readonly ChemicalRaSavedRecord[]
): ChemicalRaSavedRecord[] {
  const map = new Map<string, ChemicalRaSavedRecord>();
  for (const r of local) map.set(r.raId, r);
  for (const r of cloud) {
    const cur = map.get(r.raId);
    if (!cur || r.savedAt.localeCompare(cur.savedAt) >= 0) map.set(r.raId, r);
  }
  return Array.from(map.values()).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// ── localStorage I/O ────────────────────────────────────────
function readLocal(): ChemicalRaSavedRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChemicalRaSavedRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: ChemicalRaSavedRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* 容量超過等は無視 */
  }
}

// ── 公開API ─────────────────────────────────────────────────
/** RA結果を保存（localStorage 即時＋クラウド背景同期）。raId を返す。 */
export async function saveChemicalRaRecord(
  input: Omit<ChemicalRaSavedRecord, "raId" | "savedAt"> & { raId?: string }
): Promise<string> {
  const raId = input.raId?.trim() || `ra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const rec: ChemicalRaSavedRecord = {
    raId,
    cas: input.cas,
    substance: input.substance,
    workContent: input.workContent,
    exposureBand: input.exposureBand,
    payload: input.payload,
    savedAt: new Date().toISOString(),
  };
  writeLocal(upsertRecord(readLocal(), rec));

  if (isChemicalRaCloudEnabled()) {
    try {
      await fetch("/api/chemical/ra-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId(), record: rec }),
      });
    } catch {
      /* 失敗してもローカルに保存済み */
    }
  }
  return raId;
}

/** 保存一覧を取得（クラウド＋ローカルをマージ。クラウド未設定・失敗はローカルのみ）。 */
export async function listChemicalRaRecords(): Promise<ChemicalRaSavedRecord[]> {
  const local = readLocal();
  if (!isChemicalRaCloudEnabled()) return local;
  try {
    const res = await fetch(`/api/chemical/ra-records?deviceId=${encodeURIComponent(getDeviceId())}`);
    if (!res.ok) return local;
    const data: unknown = await res.json();
    const cloud = Array.isArray((data as { list?: unknown })?.list)
      ? ((data as { list: ChemicalRaSavedRecord[] }).list)
      : [];
    const merged = mergeRecords(local, cloud);
    writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

/** 1件削除（localStorage＋クラウド）。 */
export async function deleteChemicalRaRecord(raId: string): Promise<void> {
  writeLocal(readLocal().filter((r) => r.raId !== raId));
  if (isChemicalRaCloudEnabled()) {
    try {
      await fetch(
        `/api/chemical/ra-records?deviceId=${encodeURIComponent(getDeviceId())}&id=${encodeURIComponent(raId)}`,
        { method: "DELETE" }
      );
    } catch {
      /* ローカルは削除済み */
    }
  }
}
