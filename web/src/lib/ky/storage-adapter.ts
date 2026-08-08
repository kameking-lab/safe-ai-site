/**
 * KY全面再設計 Phase 4: クラウド保管アダプタ（ローカルファースト＋背景同期）。
 *
 * 設計方針（社長要件「クラウド接続失敗時も機能停止しない」を厳守）:
 *  - 端末内(localStorage)が常に真実の保存先。UIは従来どおり同期・即時で動く。
 *  - その上に「背景でクラウドへ同期する層」を足す。クラウドは保険／別端末共有用。
 *  - クラウドアクセスはすべてサーバー API Route 経由（/api/ky/*）。service_role は
 *    サーバー側のみで使われ、ブラウザは fetch するだけ（RLSポリシー詳細に依存しない）。
 *  - 送信失敗（オフライン等）は localStorage のキューに退避し、次回 flush で再送（最新優先）。
 *  - env（NEXT_PUBLIC_SUPABASE_URL）未設定なら何もしない（純ローカル動作）。
 *
 * テスト容易性のため、ネットワーク層は KyCloudTransport として注入差し替え可能にしている。
 */
import type { KyInstructionRecordState, KyRecordSummary } from "@/lib/types/operations";
import { normalizeKyInstructionRecord } from "@/lib/services/operations-service";
import { normalizeWorkers, type Worker } from "@/lib/ky/workers-master";
import { hasCloudConsent } from "@/lib/cloud-consent";

const DEVICE_ID_KEY = "safe-ai:ky-device-id:v1";
const SYNC_QUEUE_KEY = "safe-ai:ky-sync-queue:v1";
let volatileDeviceId: string | null = null;

export type KyCloudPull = {
  latest: KyInstructionRecordState | null;
  list: KyRecordSummary[];
};

/** クラウド送受信の抽象（本番は fetch、テストはフェイクを注入）。 */
export interface KyCloudTransport {
  putKyRecord(deviceId: string, record: KyInstructionRecordState): Promise<boolean>;
  getKyRecords(deviceId: string): Promise<KyCloudPull | null>;
  putWorkers(deviceId: string, workers: Worker[]): Promise<boolean>;
  getWorkers(deviceId: string): Promise<Worker[] | null>;
  /** Phase 6: 朝礼サイネージ共有セッションを作成し6桁コードを返す。 */
  createSignageSession(record: KyInstructionRecordState): Promise<string | null>;
  /** Phase 6: 6桁コードから共有KYを取得（期限切れ・不存在は null）。 */
  getSignageSession(code: string): Promise<KyInstructionRecordState | null>;
  /** P0-A: クラウドの単一KYを id で取得（一覧から再編集で開く）。 */
  getKyRecordById(deviceId: string, id: string): Promise<KyInstructionRecordState | null>;
  /** P0-A: クラウドのKYを id で削除。 */
  deleteKyRecord(deviceId: string, id: string): Promise<boolean>;
}

// ── クラウド有効判定・端末ID ─────────────────────────────────────
/** ブラウザに公開された Supabase URL の有無で「クラウドを試すか」を判定。 */
export function isKyCloudEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim());
}

/** 端末ごとの匿名ID（RLS/所有権の簡易キー）。初回に生成し localStorage に保存。 */
function createDeviceId(): string {
  if (typeof window.crypto?.randomUUID === "function") return window.crypto.randomUUID();
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return `dev_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** Technical availability plus the user's explicit, versioned opt-in. */
export function isKyCloudAuthorized(): boolean {
  return isKyCloudEnabled() && hasCloudConsent();
}

export function isKySignageSharingAuthorized(): false {
  return false;
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = createDeviceId();
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Storage may be disabled. Preserve a per-page high-entropy capability
    // instead of merging every restricted browser into one shared owner.
    volatileDeviceId ??= createDeviceId();
    return volatileDeviceId;
  }
}

// ── 既定トランスポート（fetch → /api/ky/*） ──────────────────────
const fetchTransport: KyCloudTransport = {
  async putKyRecord(_deviceId, record) {
    const res = await fetch("/api/ky/records", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cloud-consent": "ky-v1",
      },
      body: JSON.stringify({ record }),
    });
    return res.ok;
  },
  async getKyRecords(_deviceId) {
    const res = await fetch("/api/ky/records", {
      headers: { "x-cloud-consent": "ky-v1" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return null;
    const d = data as { latest?: unknown; list?: unknown };
    return {
      latest: d.latest ? normalizeKyInstructionRecord(d.latest) : null,
      list: Array.isArray(d.list) ? (d.list as KyRecordSummary[]) : [],
    };
  },
  async putWorkers(_deviceId, workers) {
    const res = await fetch("/api/ky/workers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cloud-consent": "ky-v1",
      },
      body: JSON.stringify({ workers }),
    });
    return res.ok;
  },
  async getWorkers(_deviceId) {
    const res = await fetch("/api/ky/workers", {
      headers: { "x-cloud-consent": "ky-v1" },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== "object") return null;
    const d = data as { workers?: unknown };
    return Array.isArray(d.workers) ? normalizeWorkers(d.workers) : null;
  },
  async createSignageSession(record) {
    const res = await fetch("/api/ky/signage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ record }),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const code = (data as { code?: unknown })?.code;
    return typeof code === "string" ? code : null;
  },
  async getSignageSession(code) {
    const res = await fetch(`/api/ky/signage?code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const rec = (data as { record?: unknown })?.record;
    return rec ? normalizeKyInstructionRecord(rec) : null;
  },
  async getKyRecordById(_deviceId, id) {
    const res = await fetch(
      `/api/ky/records?id=${encodeURIComponent(id)}`,
      { headers: { "x-cloud-consent": "ky-v1" } },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const rec = (data as { record?: unknown })?.record;
    return rec ? normalizeKyInstructionRecord(rec) : null;
  },
  async deleteKyRecord(_deviceId, id) {
    const res = await fetch(
      `/api/ky/records?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: { "x-cloud-consent": "ky-v1" },
      }
    );
    return res.ok;
  },
};

let transport: KyCloudTransport = fetchTransport;

/** テスト専用: トランスポートを差し替える（null で既定に戻す）。 */
export function __setKyCloudTransport(t: KyCloudTransport | null): void {
  transport = t ?? fetchTransport;
}

// ── 再送キュー（最新優先・オフライン耐性） ───────────────────────
type SyncQueue = { record?: KyInstructionRecordState; workers?: Worker[] };

function readQueue(): SyncQueue {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SyncQueue) : {};
  } catch {
    return {};
  }
}

function writeQueue(q: SyncQueue): void {
  if (typeof window === "undefined") return;
  try {
    if (!q.record && !q.workers) {
      window.localStorage.removeItem(SYNC_QUEUE_KEY);
    } else {
      window.localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q));
    }
  } catch {
    /* 容量超過等は無視（キューはベストエフォート） */
  }
}

function enqueue(part: Partial<SyncQueue>): void {
  // 最新優先: 同種の保留は上書き（中間状態は送らず、端末の最新状態だけ同期する）。
  writeQueue({ ...readQueue(), ...part });
}

/** 保留キューに何か残っているか（テスト・UI表示用）。 */
export function hasPendingKyCloudSync(): boolean {
  const q = readQueue();
  return Boolean(q.record || q.workers);
}

// ── 公開API（UIが使う） ─────────────────────────────────────────
/** KY記録をクラウドへ送信。失敗時はキューに退避して false を返す（例外は投げない）。 */
export async function cloudPushKyRecord(record: KyInstructionRecordState): Promise<boolean> {
  if (!isKyCloudAuthorized()) return false;
  try {
    const ok = await transport.putKyRecord(getDeviceId(), record);
    if (!ok) enqueue({ record });
    return ok;
  } catch {
    enqueue({ record });
    return false;
  }
}

/** クラウドから最新KY記録＋一覧を取得。未設定・失敗時は null。 */
export async function cloudPullKyRecords(): Promise<KyCloudPull | null> {
  if (!isKyCloudAuthorized()) return null;
  try {
    return await transport.getKyRecords(getDeviceId());
  } catch {
    return null;
  }
}

/** 作業員マスターをクラウドへ送信。失敗時はキューに退避。 */
export async function cloudPushWorkers(workers: Worker[]): Promise<boolean> {
  if (!isKyCloudAuthorized()) return false;
  try {
    const ok = await transport.putWorkers(getDeviceId(), workers);
    if (!ok) enqueue({ workers });
    return ok;
  } catch {
    enqueue({ workers });
    return false;
  }
}

/** クラウドから作業員マスターを取得。未設定・失敗時は null。 */
export async function cloudPullWorkers(): Promise<Worker[] | null> {
  if (!isKyCloudAuthorized()) return null;
  try {
    return await transport.getWorkers(getDeviceId());
  } catch {
    return null;
  }
}

/** Phase 6: サイネージ共有セッションを作成し6桁コードを返す（クラウド未設定なら null）。 */
export async function cloudCreateSignageSession(record: KyInstructionRecordState): Promise<string | null> {
  if (!isKySignageSharingAuthorized()) return null;
  try {
    return await transport.createSignageSession(record);
  } catch {
    return null;
  }
}

/**
 * R2: 6桁共有の失敗理由まで返す版（UI で正直なエラー表示をするため）。
 * 既存 cloudCreateSignageSession（string|null）は互換のため温存。
 * - cloud_not_configured: env未設定（同一端末ならサイネージ表示は可）
 * - server_error       : サーバー/DBエラー（例: Supabase権限不足 42501・管理者対応待ち）
 * - busy               : 6桁コード衝突などで一時的に発行不可
 * - network            : 通信失敗・タイムアウト
 */
export type SignageShareResult =
  | { ok: true; code: string }
  | {
      ok: false;
      reason:
        | "not_operationally_verified"
        | "cloud_not_configured"
        | "server_error"
        | "busy"
        | "network";
    };

export async function cloudCreateSignageSessionDetailed(
  _record: KyInstructionRecordState
): Promise<SignageShareResult> {
  return { ok: false, reason: "not_operationally_verified" };
}

/** Phase 6: 6桁コードから共有KYを取得（クラウド未設定・期限切れ・失敗は null）。 */
export async function cloudGetSignageSession(code: string): Promise<KyInstructionRecordState | null> {
  if (!isKySignageSharingAuthorized()) return null;
  try {
    return await transport.getSignageSession(code);
  } catch {
    return null;
  }
}

/** P0-A: クラウドの単一KYを id で取得（未設定・失敗は null）。 */
export async function cloudGetKyRecordById(id: string): Promise<KyInstructionRecordState | null> {
  if (!isKyCloudAuthorized()) return null;
  try {
    return await transport.getKyRecordById(getDeviceId(), id);
  } catch {
    return null;
  }
}

/** P0-A: クラウドのKYを id で削除（未設定・失敗は false）。 */
export async function cloudDeleteKyRecord(id: string): Promise<boolean> {
  if (!isKyCloudAuthorized()) return false;
  try {
    return await transport.deleteKyRecord(getDeviceId(), id);
  } catch {
    return false;
  }
}

/** 保留キューの再送（オンライン復帰時・マウント時に呼ぶ）。成功した分だけキューから消す。 */
export async function flushKyCloudQueue(): Promise<void> {
  if (!isKyCloudAuthorized()) return;
  const q = readQueue();
  if (!q.record && !q.workers) return;
  const deviceId = getDeviceId();
  const next: SyncQueue = { ...q };
  try {
    if (q.record && (await transport.putKyRecord(deviceId, q.record))) delete next.record;
  } catch {
    /* 残す */
  }
  try {
    if (q.workers && (await transport.putWorkers(deviceId, q.workers))) delete next.workers;
  } catch {
    /* 残す */
  }
  writeQueue(next);
}
