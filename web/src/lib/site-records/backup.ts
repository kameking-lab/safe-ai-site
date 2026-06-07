"use client";

/**
 * 現場の安全記録キット等のローカルデータの一括バックアップ（エクスポート／インポート）。
 *
 * 各ツールはこの端末（ブラウザ）の localStorage に保存される（クラウド非依存）。
 * 端末の故障・買い替え・ブラウザ初期化でデータを失わないよう、`safe-ai:` 名前空間の
 * 全データを1つのJSONとして書き出し／取り込みできるようにする（別端末への移行にも使える）。
 */

export const BACKUP_VERSION = 1;
const PREFIX = "safe-ai:";

export type BackupBundle = {
  version: number;
  exportedAt: string;
  data: Record<string, string>;
};

// ---- 純関数（テスト対象） ----

/** バックアップJSON文字列を作る。 */
export function serializeBackup(data: Record<string, string>, exportedAt: string): string {
  const bundle: BackupBundle = { version: BACKUP_VERSION, exportedAt, data };
  return JSON.stringify(bundle, null, 2);
}

/** バックアップJSONを検証して復元用データを取り出す（不正は null）。 */
export function parseBackup(json: string): BackupBundle | null {
  try {
    const obj = JSON.parse(json) as unknown;
    if (!obj || typeof obj !== "object") return null;
    const b = obj as Partial<BackupBundle>;
    if (typeof b.version !== "number") return null;
    if (!b.data || typeof b.data !== "object" || Array.isArray(b.data)) return null;
    // data の値が全て文字列であることを確認（localStorage互換）。
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(b.data)) {
      if (typeof k === "string" && typeof v === "string") data[k] = v;
    }
    return { version: b.version, exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : "", data };
  } catch {
    return null;
  }
}

/** 取り込み対象として安全なキーか（名前空間外への書き込みを防ぐ）。純関数。 */
export function isBackupKey(key: string): boolean {
  return key.startsWith(PREFIX);
}

// ---- window 依存 ----

/** localStorage から safe-ai: 名前空間のデータを収集。 */
export function collectSafeAiData(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && isBackupKey(key)) {
        const v = window.localStorage.getItem(key);
        if (v !== null) out[key] = v;
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

/** バックアップを localStorage に書き戻す（safe-ai: 名前空間のキーのみ）。書き込んだ件数を返す。 */
export function applyBackup(bundle: BackupBundle): number {
  if (typeof window === "undefined") return 0;
  let count = 0;
  for (const [k, v] of Object.entries(bundle.data)) {
    if (!isBackupKey(k)) continue; // 名前空間外は無視（安全）
    try {
      window.localStorage.setItem(k, v);
      count += 1;
    } catch {
      /* quota 等は無視 */
    }
  }
  return count;
}

export function countSafeAiKeys(): number {
  return Object.keys(collectSafeAiData()).length;
}
