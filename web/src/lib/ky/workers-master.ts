/**
 * KY全面再設計 Phase 3: 作業員マスター。
 *
 * 社長要件: サインは直筆でなく、人を登録すればプルダウン/チェックボックスで選べる。
 * 一度登録した作業員を再利用することで、毎朝の氏名手入力をなくす（「現場に何かさせる」
 * のではなく、職長がマスターから選ぶ効率化）。
 *
 * 保存は端末内(localStorage)だけ。最終利用から31日で期限切れにし、
 * 新しいKYメンバー台帳へ移行できた時は旧台帳を削除する。
 */

export type WorkerAffiliation = "self" | "coop1" | "coop2" | "coop3";

export type Worker = {
  id: string;
  name: string;
  /** 所属区分 */
  affiliation: WorkerAffiliation;
  /** 会社名（協力会社の場合に使用） */
  company: string;
  /** 必要資格No.（例: "1,10"） */
  qualNo: string;
  /** 常用作業員（毎日来る）フラグ。KY作成時に初期選択候補にする */
  isRegular: boolean;
  /** 退職等で一覧から隠す（ハード削除と別に非表示も可能に） */
  hidden: boolean;
  createdAt: number;
  /** 端末内保持期限を更新した最後の利用時刻。 */
  lastUsedAt?: number;
  /** 最終利用から31日後。旧データは読み込み時に補完・期限切れ削除する。 */
  expiresAt?: number;
};

export const WORKER_AFFILIATION_LABELS: Record<WorkerAffiliation, string> = {
  self: "自社",
  coop1: "協力会社（1次）",
  coop2: "協力会社（2次）",
  coop3: "協力会社（3次）",
};

export const WORKERS_STORAGE_KEY = "safe-ai:ky-workers:v1";
export const WORKER_RETENTION_DAYS = 31;
export const WORKER_MAX_RECORDS = 80;

const WORKER_RETENTION_MS = WORKER_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const VALID_AFFILIATIONS: readonly WorkerAffiliation[] = ["self", "coop1", "coop2", "coop3"];

function genId(now: number = Date.now()): string {
  return `w_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 任意の入力を Worker 形に正規化（壊れたデータ・旧データ対策） */
export function normalizeWorker(
  raw: unknown,
  now: number = Date.now(),
): Worker | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  const affiliation = VALID_AFFILIATIONS.includes(r.affiliation as WorkerAffiliation)
    ? (r.affiliation as WorkerAffiliation)
    : "self";
  const createdAt =
    typeof r.createdAt === "number" && Number.isFinite(r.createdAt)
      ? r.createdAt
      : now;
  const lastUsedAt =
    typeof r.lastUsedAt === "number" && Number.isFinite(r.lastUsedAt)
      ? r.lastUsedAt
      : createdAt;
  const expiresAt =
    typeof r.expiresAt === "number" && Number.isFinite(r.expiresAt)
      ? r.expiresAt
      : lastUsedAt + WORKER_RETENTION_MS;
  return {
    id: typeof r.id === "string" && r.id ? r.id : genId(),
    name,
    affiliation,
    company: typeof r.company === "string" ? r.company : "",
    qualNo: typeof r.qualNo === "string" ? r.qualNo : "",
    isRegular: r.isRegular === true,
    hidden: r.hidden === true,
    createdAt,
    lastUsedAt,
    expiresAt,
  };
}

export function normalizeWorkers(
  raw: unknown,
  now: number = Date.now(),
): Worker[] {
  if (!Array.isArray(raw)) return [];
  const out: Worker[] = [];
  for (const item of raw) {
    const w = normalizeWorker(item, now);
    if (w && (w.expiresAt ?? 0) > now) out.push(w);
  }
  return out
    .sort(
      (a, b) =>
        (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt),
    )
    .slice(0, WORKER_MAX_RECORDS);
}

export type NewWorkerInput = {
  name: string;
  affiliation?: WorkerAffiliation;
  company?: string;
  qualNo?: string;
  isRegular?: boolean;
};

/** 新規作業員を追加した新しい配列を返す（純粋関数）。氏名空はそのまま返す。 */
export function addWorker(list: Worker[], input: NewWorkerInput, now: number = Date.now()): Worker[] {
  const name = input.name.trim();
  if (!name) return list;
  const worker: Worker = {
    id: genId(now),
    name,
    affiliation: input.affiliation ?? "self",
    company: (input.company ?? "").trim(),
    qualNo: (input.qualNo ?? "").trim(),
    isRegular: input.isRegular ?? false,
    hidden: false,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: now + WORKER_RETENTION_MS,
  };
  return normalizeWorkers([...list, worker], now);
}

export function updateWorker(list: Worker[], id: string, patch: Partial<Omit<Worker, "id">>): Worker[] {
  return list.map((w) => (w.id === id ? { ...w, ...patch } : w));
}

/** ハード削除 */
export function removeWorker(list: Worker[], id: string): Worker[] {
  return list.filter((w) => w.id !== id);
}

/** 非表示/再表示の切り替え（退職者対応） */
export function setWorkerHidden(list: Worker[], id: string, hidden: boolean): Worker[] {
  return updateWorker(list, id, { hidden });
}

/** 表示対象（非表示でない）作業員。常用→氏名順で並べる */
export function visibleWorkers(list: Worker[]): Worker[] {
  return list
    .filter((w) => !w.hidden)
    .sort((a, b) => {
      if (a.isRegular !== b.isRegular) return a.isRegular ? -1 : 1;
      return a.name.localeCompare(b.name, "ja");
    });
}

/** 編集・明示利用した台帳を最終利用から31日へ更新する。 */
export function touchWorkers(
  list: Worker[],
  now: number = Date.now(),
): Worker[] {
  return normalizeWorkers(
    list.map((worker) => ({
      ...worker,
      lastUsedAt: now,
      expiresAt: now + WORKER_RETENTION_MS,
    })),
    now,
  );
}

// ── localStorage 連携 ───────────────────────────────────────────
export function loadWorkers(now: number = Date.now()): Worker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!raw) return [];
    const workers = normalizeWorkers(JSON.parse(raw), now);
    if (workers.length > 0) {
      window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
    } else {
      window.localStorage.removeItem(WORKERS_STORAGE_KEY);
    }
    return workers;
  } catch {
    try {
      window.localStorage.removeItem(WORKERS_STORAGE_KEY);
    } catch {
      // storage利用不能時もKY作成を継続する。
    }
    return [];
  }
}

export function saveWorkers(list: Worker[], now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    const workers = normalizeWorkers(list, now);
    if (workers.length > 0) {
      window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(workers));
    } else {
      window.localStorage.removeItem(WORKERS_STORAGE_KEY);
    }
  } catch {
    // 保存失敗（容量・プライベートモード）は黙って無視
  }
}

export function clearWorkers(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WORKERS_STORAGE_KEY);
  } catch {
    // storage利用不能時もKY作成を継続する。
  }
}
