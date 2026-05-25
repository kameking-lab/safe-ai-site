/**
 * KY全面再設計 Phase 3: 作業員マスター。
 *
 * 社長要件: サインは直筆でなく、人を登録すればプルダウン/チェックボックスで選べる。
 * 一度登録した作業員を再利用することで、毎朝の氏名手入力をなくす（「現場に何かさせる」
 * のではなく、職長がマスターから選ぶ効率化）。
 *
 * 保存はまず端末内(localStorage)。Phase 4 でクラウド同期に拡張する想定だが、
 * クラウド失敗時も端末内で動き続けられるよう、ここは純粋なローカル実装に保つ。
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
};

export const WORKER_AFFILIATION_LABELS: Record<WorkerAffiliation, string> = {
  self: "自社",
  coop1: "協力会社（1次）",
  coop2: "協力会社（2次）",
  coop3: "協力会社（3次）",
};

export const WORKERS_STORAGE_KEY = "safe-ai:ky-workers:v1";

const VALID_AFFILIATIONS: readonly WorkerAffiliation[] = ["self", "coop1", "coop2", "coop3"];

function genId(now: number = Date.now()): string {
  return `w_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 任意の入力を Worker 形に正規化（壊れたデータ・旧データ対策） */
export function normalizeWorker(raw: unknown): Worker | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  const affiliation = VALID_AFFILIATIONS.includes(r.affiliation as WorkerAffiliation)
    ? (r.affiliation as WorkerAffiliation)
    : "self";
  return {
    id: typeof r.id === "string" && r.id ? r.id : genId(),
    name,
    affiliation,
    company: typeof r.company === "string" ? r.company : "",
    qualNo: typeof r.qualNo === "string" ? r.qualNo : "",
    isRegular: r.isRegular === true,
    hidden: r.hidden === true,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
  };
}

export function normalizeWorkers(raw: unknown): Worker[] {
  if (!Array.isArray(raw)) return [];
  const out: Worker[] = [];
  for (const item of raw) {
    const w = normalizeWorker(item);
    if (w) out.push(w);
  }
  return out;
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
  };
  return [...list, worker];
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

// ── localStorage 連携 ───────────────────────────────────────────
export function loadWorkers(): Worker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WORKERS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeWorkers(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveWorkers(list: Worker[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORKERS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 保存失敗（容量・プライベートモード）は黙って無視
  }
}
