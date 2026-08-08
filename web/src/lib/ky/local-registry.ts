import {
  KY_LOCAL_SCHEMA_VERSION,
  KY_MAX_DRAFTS,
  KY_MAX_MEMBERS,
  KY_RETENTION_DAYS,
  addDaysIso,
  revalidateKyWeatherStaleness,
  type KyLocalDraft,
  type KyLocalSnapshot,
  type KyMember,
  type KyStorageMode,
} from "@/lib/ky/zero-friction-types";

const DB_NAME = "safe-ai-ky-local-v2";
const DB_VERSION = 1;
const DRAFT_STORE = "drafts";
const MEMBER_STORE = "members";

const memoryDrafts = new Map<string, KyLocalDraft>();
const memoryMembers = new Map<string, KyMember>();

export type KyStorageWriteResult = {
  ok: boolean;
  mode: KyStorageMode;
  error: "unavailable" | "quota" | null;
};

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function openKyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_open_failed"));
    request.onblocked = () => reject(new Error("indexeddb_blocked"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        const drafts = database.createObjectStore(DRAFT_STORE, { keyPath: "id" });
        drafts.createIndex("updatedAt", "updatedAt", { unique: false });
        drafts.createIndex("expiresAt", "expiresAt", { unique: false });
      }
      if (!database.objectStoreNames.contains(MEMBER_STORE)) {
        const members = database.createObjectStore(MEMBER_STORE, { keyPath: "id" });
        members.createIndex("lastUsedAt", "lastUsedAt", { unique: false });
        members.createIndex("expiresAt", "expiresAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_request_failed"));
  });
}

async function readAll<T>(storeName: string): Promise<T[]> {
  const database = await openKyDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    return await requestValue(store.getAll() as IDBRequest<T[]>);
  } finally {
    database.close();
  }
}

async function putValue<T>(storeName: string, value: T): Promise<void> {
  const database = await openKyDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("indexeddb_write_failed"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("indexeddb_write_aborted"));
      transaction.objectStore(storeName).put(value);
    });
  } finally {
    database.close();
  }
}

async function deleteValue(storeName: string, key: string): Promise<void> {
  const database = await openKyDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("indexeddb_delete_failed"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("indexeddb_delete_aborted"));
      transaction.objectStore(storeName).delete(key);
    });
  } finally {
    database.close();
  }
}

async function clearStore(storeName: string): Promise<void> {
  const database = await openKyDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("indexeddb_clear_failed"));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("indexeddb_clear_aborted"));
      transaction.objectStore(storeName).clear();
    });
  } finally {
    database.close();
  }
}

function validIso(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validDraft(value: unknown): value is KyLocalDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<KyLocalDraft>;
  return (
    draft.schemaVersion === KY_LOCAL_SCHEMA_VERSION &&
    typeof draft.id === "string" &&
    validIso(draft.createdAt) &&
    validIso(draft.updatedAt) &&
    validIso(draft.expiresAt) &&
    typeof draft.workDescription === "string" &&
    Array.isArray(draft.hazards) &&
    Array.isArray(draft.selectedMembers)
  );
}

function validMember(value: unknown): value is KyMember {
  if (!value || typeof value !== "object") return false;
  const member = value as Partial<KyMember>;
  return (
    typeof member.id === "string" &&
    typeof member.displayName === "string" &&
    member.displayName.trim().length > 0 &&
    typeof member.role === "string" &&
    validIso(member.createdAt) &&
    validIso(member.lastUsedAt) &&
    validIso(member.expiresAt)
  );
}

export function cleanupKyLocalRecords(input: {
  drafts: unknown[];
  members: unknown[];
  now?: Date;
}): { drafts: KyLocalDraft[]; members: KyMember[] } {
  const nowMs = (input.now ?? new Date()).getTime();
  const drafts = input.drafts
    .filter(validDraft)
    .filter((draft) => Date.parse(draft.expiresAt) > nowMs)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, KY_MAX_DRAFTS);
  const members = input.members
    .filter(validMember)
    .filter((member) => Date.parse(member.expiresAt) > nowMs)
    .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
    .slice(0, KY_MAX_MEMBERS);
  return { drafts, members };
}

async function removeDiscardedRecords(input: {
  beforeDrafts: unknown[];
  beforeMembers: unknown[];
  keptDrafts: KyLocalDraft[];
  keptMembers: KyMember[];
}): Promise<void> {
  const draftIds = new Set(input.keptDrafts.map((draft) => draft.id));
  const memberIds = new Set(input.keptMembers.map((member) => member.id));
  const draftDeletes = input.beforeDrafts.flatMap((value) => {
    const id =
      value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string"
        ? (value as { id: string }).id
        : null;
    return id && !draftIds.has(id) ? [deleteValue(DRAFT_STORE, id)] : [];
  });
  const memberDeletes = input.beforeMembers.flatMap((value) => {
    const id =
      value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string"
        ? (value as { id: string }).id
        : null;
    return id && !memberIds.has(id) ? [deleteValue(MEMBER_STORE, id)] : [];
  });
  await Promise.all([...draftDeletes, ...memberDeletes]);
}

function memorySnapshot(now = new Date()): KyLocalSnapshot {
  const cleaned = cleanupKyLocalRecords({
    drafts: [...memoryDrafts.values()],
    members: [...memoryMembers.values()],
    now,
  });
  memoryDrafts.clear();
  memoryMembers.clear();
  const drafts = cleaned.drafts.map((draft) => ({
    ...draft,
    weather: draft.weather
      ? revalidateKyWeatherStaleness(draft.weather, now)
      : null,
  }));
  for (const draft of drafts) memoryDrafts.set(draft.id, draft);
  for (const member of cleaned.members) memoryMembers.set(member.id, member);
  return {
    ...cleaned,
    drafts,
    storageMode: "memory",
    error: "unavailable",
  };
}

export async function loadKyLocalSnapshot(
  now = new Date(),
): Promise<KyLocalSnapshot> {
  try {
    const [rawDrafts, rawMembers] = await Promise.all([
      readAll<unknown>(DRAFT_STORE),
      readAll<unknown>(MEMBER_STORE),
    ]);
    const cleaned = cleanupKyLocalRecords({
      drafts: rawDrafts,
      members: rawMembers,
      now,
    });
    const drafts = cleaned.drafts.map((draft) => ({
      ...draft,
      weather: draft.weather
        ? revalidateKyWeatherStaleness(draft.weather, now)
        : null,
    }));
    await removeDiscardedRecords({
      beforeDrafts: rawDrafts,
      beforeMembers: rawMembers,
      keptDrafts: cleaned.drafts,
      keptMembers: cleaned.members,
    });
    return {
      ...cleaned,
      drafts,
      storageMode: "indexeddb",
      error: null,
    };
  } catch {
    return memorySnapshot(now);
  }
}

async function writeWithFallback<T extends { id: string }>(input: {
  storeName: string;
  value: T;
  memory: Map<string, T>;
}): Promise<KyStorageWriteResult> {
  input.memory.set(input.value.id, input.value);
  try {
    await putValue(input.storeName, input.value);
    return { ok: true, mode: "indexeddb", error: null };
  } catch (error) {
    return {
      ok: false,
      mode: "memory",
      error: isQuotaError(error) ? "quota" : "unavailable",
    };
  }
}

function trimMemoryMap<T extends { id: string }>(
  memory: Map<string, T>,
  max: number,
  timestamp: (value: T) => string,
): void {
  const kept = [...memory.values()]
    .sort((a, b) => Date.parse(timestamp(b)) - Date.parse(timestamp(a)))
    .slice(0, max);
  memory.clear();
  kept.forEach((value) => memory.set(value.id, value));
}

async function enforceStoreCap<T extends { id: string }>(input: {
  storeName: string;
  max: number;
  timestamp: (value: T) => string;
}): Promise<void> {
  const values = await readAll<T>(input.storeName);
  const discarded = values
    .sort((a, b) => Date.parse(input.timestamp(b)) - Date.parse(input.timestamp(a)))
    .slice(input.max);
  await Promise.all(
    discarded.map((value) => deleteValue(input.storeName, value.id)),
  );
}

export async function saveKyDraftLocal(
  draft: KyLocalDraft,
): Promise<KyStorageWriteResult> {
  const result = await writeWithFallback({
    storeName: DRAFT_STORE,
    value: draft,
    memory: memoryDrafts,
  });
  trimMemoryMap(memoryDrafts, KY_MAX_DRAFTS, (value) => value.updatedAt);
  if (result.ok) {
    await enforceStoreCap<KyLocalDraft>({
      storeName: DRAFT_STORE,
      max: KY_MAX_DRAFTS,
      timestamp: (value) => value.updatedAt,
    }).catch(() => {});
  }
  return result;
}

export async function saveKyMemberLocal(
  member: KyMember,
): Promise<KyStorageWriteResult> {
  const result = await writeWithFallback({
    storeName: MEMBER_STORE,
    value: member,
    memory: memoryMembers,
  });
  trimMemoryMap(memoryMembers, KY_MAX_MEMBERS, (value) => value.lastUsedAt);
  if (result.ok) {
    await enforceStoreCap<KyMember>({
      storeName: MEMBER_STORE,
      max: KY_MAX_MEMBERS,
      timestamp: (value) => value.lastUsedAt,
    }).catch(() => {});
  }
  return result;
}

export async function deleteKyDraftLocal(id: string): Promise<void> {
  memoryDrafts.delete(id);
  await deleteValue(DRAFT_STORE, id).catch(() => {});
}

export async function deleteKyMemberLocal(id: string): Promise<void> {
  memoryMembers.delete(id);
  await deleteValue(MEMBER_STORE, id).catch(() => {});
}

export async function deleteAllKyMembersLocal(): Promise<void> {
  memoryMembers.clear();
  await clearStore(MEMBER_STORE).catch(() => {});
}

export function refreshKyMemberRetention(
  member: KyMember,
  now: Date = new Date(),
): KyMember {
  const iso = now.toISOString();
  return {
    ...member,
    lastUsedAt: iso,
    expiresAt: addDaysIso(iso, KY_RETENTION_DAYS),
  };
}

export async function touchKyMembers(
  members: KyMember[],
  now: Date = new Date(),
): Promise<KyMember[]> {
  const touched = members.map((member) => refreshKyMemberRetention(member, now));
  await Promise.all(touched.map((member) => saveKyMemberLocal(member)));
  return touched;
}

export function previousMembersFromDrafts(
  drafts: KyLocalDraft[],
): KyLocalDraft["selectedMembers"] {
  return drafts.find((draft) => draft.selectedMembers.length > 0)?.selectedMembers ?? [];
}

export function __resetKyMemoryStorageForTests(): void {
  memoryDrafts.clear();
  memoryMembers.clear();
}
