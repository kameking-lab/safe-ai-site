/**
 * P1-5 化学物質RA結果のローカルファースト保管＋クラウド同期（client）。
 *
 * KY storage-adapter と同方針:
 *  - localStorage を常に真実の保存先とし、クラウド(/api/chemical/ra-records)へ背景同期する。
 *  - クラウド未設定・失敗でも保存・一覧は localStorage で機能する（壊れない）。
 *  - 端末ID(getDeviceId)はKYと共有。
 */
const STORE_KEY = "safe-ai:chemical-ra-records:v1";

export const CHEMICAL_RA_RECORD_PAYLOAD_TYPE =
  "chemical-ra-reference-record-v2" as const;
export const CHEMICAL_RA_REFERENCE_RULE_VERSION =
  "reference-information-record-2026-07-24" as const;

export type ChemicalRaSdsStatus =
  | "confirmed"
  | "not-confirmed"
  | "unknown";
export type ChemicalRaVentilation =
  | "none"
  | "general"
  | "local"
  | null;
export type ChemicalRaAmount = "small" | "medium" | "large" | null;
export type ChemicalRaTriState = "yes" | "no" | "unknown";
export type ChemicalRaFrequency =
  | "one-off"
  | "daily"
  | "weekly"
  | "monthly"
  | "less-than-monthly"
  | null;
export type ChemicalRaDispersion =
  | "none"
  | "dust"
  | "mist"
  | "spray"
  | "vapor"
  | "other"
  | null;
export type ChemicalRaPpeSuitability =
  | "confirmed"
  | "not-confirmed"
  | "unknown";
export type ChemicalRaSubstitutionStatus =
  | "considered"
  | "not-considered"
  | "not-applicable"
  | "unknown";

export type ChemicalRaSnapshotMissingField =
  | "work-content"
  | "sds-confirmation"
  | "sds-issued-on"
  | "component-version"
  | "ventilation"
  | "general-ventilation"
  | "local-exhaust"
  | "amount"
  | "duration-hours"
  | "frequency"
  | "use-temperature"
  | "dispersion"
  | "skin-contact"
  | "ppe"
  | "ppe-suitability"
  | "substitution"
  | "existing-controls"
  | "additional-controls"
  | "action-owner"
  | "action-due-on"
  | "reassessment-on"
  | "measured-concentration"
  | "measured-unit"
  | "rule-version"
  | "captured-at";

export type ChemicalRaAssessmentSnapshot = Readonly<{
  schemaVersion: 1;
  /**
   * 本サイト独自の計算結果ではなく、公式資料・公式ツールへ確認するための
   * 参考情報記録であることを固定する。
   */
  basis: "reference-information-only";
  ruleVersion: string | null;
  capturedAt: string | null;
  workContent: string;
  sds: Readonly<{
    status: ChemicalRaSdsStatus;
    issuedOn: string | null;
    componentVersion: string | null;
  }>;
  ventilation: ChemicalRaVentilation;
  engineeringControls: Readonly<{
    generalVentilation: ChemicalRaTriState;
    localExhaust: ChemicalRaTriState;
  }>;
  amount: ChemicalRaAmount;
  durationHours: number | null;
  frequency: ChemicalRaFrequency;
  useTemperatureC: number | null;
  dispersion: ChemicalRaDispersion;
  skinContact: ChemicalRaTriState;
  ppe: Readonly<{
    description: string;
    suitability: ChemicalRaPpeSuitability;
  }>;
  substitution: ChemicalRaSubstitutionStatus;
  controls: Readonly<{
    existing: string;
    additional: string;
  }>;
  action: Readonly<{
    owner: string;
    dueOn: string | null;
    reassessmentOn: string | null;
  }>;
  measuredConcentration: Readonly<{
    value: string | null;
    unit: string | null;
  }>;
  completeness: "complete" | "incomplete";
  missingFields: readonly ChemicalRaSnapshotMissingField[];
}>;

export type ChemicalRaRecordPayloadV2 = Readonly<{
  type: typeof CHEMICAL_RA_RECORD_PAYLOAD_TYPE;
  schemaVersion: 2;
  result: unknown;
  assessmentSnapshot: ChemicalRaAssessmentSnapshot;
}>;

export type ChemicalRaPayloadInspection = {
  result: unknown;
  assessmentSnapshot: ChemicalRaAssessmentSnapshot | null;
  status: "complete" | "incomplete" | "legacy-missing";
  missingFields: readonly ChemicalRaSnapshotMissingField[];
};

export type ChemicalRaSnapshotInput = {
  workContent?: string;
  sdsStatus?: ChemicalRaSdsStatus | "";
  sdsIssuedOn?: string;
  componentVersion?: string;
  ventilation?: Exclude<ChemicalRaVentilation, null> | "";
  generalVentilation?: ChemicalRaTriState | "";
  localExhaust?: ChemicalRaTriState | "";
  amount?: Exclude<ChemicalRaAmount, null> | "";
  durationHours?: string | number;
  frequency?: Exclude<ChemicalRaFrequency, null> | "";
  useTemperatureC?: string | number;
  dispersion?: Exclude<ChemicalRaDispersion, null> | "";
  skinContact?: ChemicalRaTriState | "";
  ppeDescription?: string;
  ppeSuitability?: ChemicalRaPpeSuitability | "";
  substitution?: ChemicalRaSubstitutionStatus | "";
  existingControls?: string;
  additionalControls?: string;
  actionOwner?: string;
  actionDueOn?: string;
  reassessmentOn?: string;
  measuredConcentration?: string;
  measuredUnit?: string;
  /** テストまたは移行用。通常は保存時に savedAt で上書きされる。 */
  capturedAt?: string | null;
};

const ALL_SNAPSHOT_FIELDS: readonly ChemicalRaSnapshotMissingField[] = [
  "work-content",
  "sds-confirmation",
  "sds-issued-on",
  "component-version",
  "ventilation",
  "general-ventilation",
  "local-exhaust",
  "amount",
  "duration-hours",
  "frequency",
  "use-temperature",
  "dispersion",
  "skin-contact",
  "ppe",
  "ppe-suitability",
  "substitution",
  "existing-controls",
  "additional-controls",
  "action-owner",
  "action-due-on",
  "reassessment-on",
  "measured-concentration",
  "measured-unit",
  "rule-version",
  "captured-at",
];

function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(value: unknown): string | null {
  const text = textOrEmpty(value);
  return text || null;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Date.parse(value))
  );
}

function validDateOnly(value: unknown): string | null {
  const text = textOrEmpty(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === text
    ? text
    : null;
}

function normalizeDuration(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 24 ? parsed : null;
}

function normalizeTemperature(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed >= -50 && parsed <= 200
    ? parsed
    : null;
}

function normalizeTriState(value: unknown): ChemicalRaTriState {
  return value === "yes" || value === "no" ? value : "unknown";
}

function normalizeMeasuredValue(value: unknown): string | null {
  const text =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : textOrEmpty(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? text : null;
}

function normalizeSnapshot(
  raw: unknown,
  capturedAtOverride?: string,
): ChemicalRaAssessmentSnapshot {
  const value =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const sdsRaw =
    value.sds && typeof value.sds === "object" && !Array.isArray(value.sds)
      ? (value.sds as Record<string, unknown>)
      : {};
  const measuredRaw =
    value.measuredConcentration &&
    typeof value.measuredConcentration === "object" &&
    !Array.isArray(value.measuredConcentration)
      ? (value.measuredConcentration as Record<string, unknown>)
      : {};
  const engineeringRaw =
    value.engineeringControls &&
    typeof value.engineeringControls === "object" &&
    !Array.isArray(value.engineeringControls)
      ? (value.engineeringControls as Record<string, unknown>)
      : {};
  const ppeRaw =
    value.ppe && typeof value.ppe === "object" && !Array.isArray(value.ppe)
      ? (value.ppe as Record<string, unknown>)
      : {};
  const controlsRaw =
    value.controls &&
    typeof value.controls === "object" &&
    !Array.isArray(value.controls)
      ? (value.controls as Record<string, unknown>)
      : {};
  const actionRaw =
    value.action &&
    typeof value.action === "object" &&
    !Array.isArray(value.action)
      ? (value.action as Record<string, unknown>)
      : {};
  const sdsStatus: ChemicalRaSdsStatus =
    sdsRaw.status === "confirmed" || sdsRaw.status === "not-confirmed"
      ? sdsRaw.status
      : "unknown";
  const ventilation: ChemicalRaVentilation =
    value.ventilation === "none" ||
    value.ventilation === "general" ||
    value.ventilation === "local"
      ? value.ventilation
      : null;
  const amount: ChemicalRaAmount =
    value.amount === "small" ||
    value.amount === "medium" ||
    value.amount === "large"
      ? value.amount
      : null;
  const frequency: ChemicalRaFrequency =
    value.frequency === "one-off" ||
    value.frequency === "daily" ||
    value.frequency === "weekly" ||
    value.frequency === "monthly" ||
    value.frequency === "less-than-monthly"
      ? value.frequency
      : null;
  const dispersion: ChemicalRaDispersion =
    value.dispersion === "none" ||
    value.dispersion === "dust" ||
    value.dispersion === "mist" ||
    value.dispersion === "spray" ||
    value.dispersion === "vapor" ||
    value.dispersion === "other"
      ? value.dispersion
      : null;
  const generalVentilation = normalizeTriState(
    engineeringRaw.generalVentilation,
  );
  const localExhaust = normalizeTriState(engineeringRaw.localExhaust);
  const skinContact = normalizeTriState(value.skinContact);
  const ppeSuitability: ChemicalRaPpeSuitability =
    ppeRaw.suitability === "confirmed" ||
    ppeRaw.suitability === "not-confirmed"
      ? ppeRaw.suitability
      : "unknown";
  const substitution: ChemicalRaSubstitutionStatus =
    value.substitution === "considered" ||
    value.substitution === "not-considered" ||
    value.substitution === "not-applicable"
      ? value.substitution
      : "unknown";
  const capturedAt = capturedAtOverride
    ? capturedAtOverride
    : isIsoTimestamp(value.capturedAt)
      ? value.capturedAt
      : null;
  const ruleVersion =
    typeof value.ruleVersion === "string" && value.ruleVersion.trim() !== ""
      ? value.ruleVersion
      : null;
  const workContent = textOrEmpty(value.workContent);
  const issuedOn = validDateOnly(sdsRaw.issuedOn);
  const componentVersion = textOrNull(sdsRaw.componentVersion);
  const durationHours = normalizeDuration(value.durationHours);
  const useTemperatureC = normalizeTemperature(value.useTemperatureC);
  const ppeDescription = textOrEmpty(ppeRaw.description);
  const existingControls = textOrEmpty(controlsRaw.existing);
  const additionalControls = textOrEmpty(controlsRaw.additional);
  const actionOwner = textOrEmpty(actionRaw.owner);
  const actionDueOn = validDateOnly(actionRaw.dueOn);
  const reassessmentOn = validDateOnly(actionRaw.reassessmentOn);
  const measuredValue = normalizeMeasuredValue(measuredRaw.value);
  const measuredUnit = textOrNull(measuredRaw.unit);

  const missingFields: ChemicalRaSnapshotMissingField[] = [];
  if (!workContent) missingFields.push("work-content");
  if (sdsStatus !== "confirmed") missingFields.push("sds-confirmation");
  if (!issuedOn) missingFields.push("sds-issued-on");
  if (!componentVersion) missingFields.push("component-version");
  if (!ventilation) missingFields.push("ventilation");
  if (generalVentilation === "unknown") {
    missingFields.push("general-ventilation");
  }
  if (localExhaust === "unknown") missingFields.push("local-exhaust");
  if (!amount) missingFields.push("amount");
  if (durationHours === null) missingFields.push("duration-hours");
  if (!frequency) missingFields.push("frequency");
  if (useTemperatureC === null) missingFields.push("use-temperature");
  if (!dispersion) missingFields.push("dispersion");
  if (skinContact === "unknown") missingFields.push("skin-contact");
  if (!ppeDescription) missingFields.push("ppe");
  if (ppeSuitability !== "confirmed") missingFields.push("ppe-suitability");
  if (substitution === "unknown") missingFields.push("substitution");
  if (!existingControls) missingFields.push("existing-controls");
  if (!additionalControls) missingFields.push("additional-controls");
  if (!actionOwner) missingFields.push("action-owner");
  if (!actionDueOn) missingFields.push("action-due-on");
  if (!reassessmentOn) missingFields.push("reassessment-on");
  if (measuredValue === null) missingFields.push("measured-concentration");
  if (!measuredUnit) missingFields.push("measured-unit");
  if (ruleVersion !== CHEMICAL_RA_REFERENCE_RULE_VERSION) {
    missingFields.push("rule-version");
  }
  if (!capturedAt || !isIsoTimestamp(capturedAt)) {
    missingFields.push("captured-at");
  }

  return Object.freeze({
    schemaVersion: 1 as const,
    basis: "reference-information-only" as const,
    ruleVersion,
    capturedAt,
    workContent,
    sds: Object.freeze({
      status: sdsStatus,
      issuedOn,
      componentVersion,
    }),
    ventilation,
    engineeringControls: Object.freeze({
      generalVentilation,
      localExhaust,
    }),
    amount,
    durationHours,
    frequency,
    useTemperatureC,
    dispersion,
    skinContact,
    ppe: Object.freeze({
      description: ppeDescription,
      suitability: ppeSuitability,
    }),
    substitution,
    controls: Object.freeze({
      existing: existingControls,
      additional: additionalControls,
    }),
    action: Object.freeze({
      owner: actionOwner,
      dueOn: actionDueOn,
      reassessmentOn,
    }),
    measuredConcentration: Object.freeze({
      value: measuredValue,
      unit: measuredUnit,
    }),
    completeness:
      missingFields.length === 0 ? ("complete" as const) : ("incomplete" as const),
    missingFields: Object.freeze(missingFields),
  });
}

export function createChemicalRaRecordPayload(
  result: unknown,
  input: ChemicalRaSnapshotInput,
): ChemicalRaRecordPayloadV2 {
  const draft = {
    ruleVersion: CHEMICAL_RA_REFERENCE_RULE_VERSION,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    workContent: input.workContent,
    sds: {
      status: input.sdsStatus || "unknown",
      issuedOn: input.sdsIssuedOn,
      componentVersion: input.componentVersion,
    },
    ventilation: input.ventilation || null,
    engineeringControls: {
      generalVentilation: input.generalVentilation || "unknown",
      localExhaust: input.localExhaust || "unknown",
    },
    amount: input.amount || null,
    durationHours: input.durationHours,
    frequency: input.frequency || null,
    useTemperatureC: input.useTemperatureC,
    dispersion: input.dispersion || null,
    skinContact: input.skinContact || "unknown",
    ppe: {
      description: input.ppeDescription,
      suitability: input.ppeSuitability || "unknown",
    },
    substitution: input.substitution || "unknown",
    controls: {
      existing: input.existingControls,
      additional: input.additionalControls,
    },
    action: {
      owner: input.actionOwner,
      dueOn: input.actionDueOn,
      reassessmentOn: input.reassessmentOn,
    },
    measuredConcentration: {
      value: input.measuredConcentration,
      unit: input.measuredUnit,
    },
  };
  return Object.freeze({
    type: CHEMICAL_RA_RECORD_PAYLOAD_TYPE,
    schemaVersion: 2 as const,
    result,
    assessmentSnapshot: normalizeSnapshot(draft),
  });
}

export function inspectChemicalRaRecordPayload(
  payload: unknown,
): ChemicalRaPayloadInspection {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    (payload as Record<string, unknown>).type !==
      CHEMICAL_RA_RECORD_PAYLOAD_TYPE
  ) {
    return {
      result: payload,
      assessmentSnapshot: null,
      status: "legacy-missing",
      missingFields: ALL_SNAPSHOT_FIELDS,
    };
  }
  const value = payload as Record<string, unknown>;
  const snapshot = normalizeSnapshot(value.assessmentSnapshot);
  return {
    result: value.result,
    assessmentSnapshot: snapshot,
    status: snapshot.completeness,
    missingFields: snapshot.missingFields,
  };
}

function clonePayload(value: unknown): unknown {
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
  } catch {
    // JSON互換の保存形式へフォールバックする。
  }
  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    return null;
  }
}

function finalizePayload(payload: unknown, savedAt: string): unknown {
  const inspected = inspectChemicalRaRecordPayload(payload);
  if (!inspected.assessmentSnapshot) return clonePayload(payload);
  const assessmentSnapshot = normalizeSnapshot(
    inspected.assessmentSnapshot,
    savedAt,
  );
  return {
    type: CHEMICAL_RA_RECORD_PAYLOAD_TYPE,
    schemaVersion: 2,
    result: clonePayload(inspected.result),
    assessmentSnapshot,
  } satisfies ChemicalRaRecordPayloadV2;
}

export interface ChemicalRaSavedRecord {
  raId: string;
  cas: string;
  substance: string;
  workContent: string;
  exposureBand: string;
  payload: unknown;
  savedAt: string;
  syncState: "saved-locally" | "sync-pending" | "synced" | "failed" | "shared";
  lastSyncAttemptAt?: string;
  syncedAt?: string;
}

export type ChemicalRaCloudStatus =
  | "not-requested"
  | "not-configured"
  | "synced"
  | "failed";

export type ChemicalRaSaveResult = {
  raId: string;
  localStatus: "saved-locally" | "failed";
  cloudStatus: ChemicalRaCloudStatus;
};

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
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const record = value as Partial<ChemicalRaSavedRecord>;
      if (
        typeof record.raId !== "string" ||
        typeof record.savedAt !== "string" ||
        typeof record.substance !== "string"
      ) {
        return [];
      }
      const syncState = [
        "saved-locally",
        "sync-pending",
        "synced",
        "failed",
        "shared",
      ].includes(record.syncState ?? "")
        ? record.syncState!
        : "saved-locally";
      return [{
        raId: record.raId,
        cas: typeof record.cas === "string" ? record.cas : "",
        substance: record.substance,
        workContent: typeof record.workContent === "string" ? record.workContent : "",
        exposureBand:
          typeof record.exposureBand === "string" ? record.exposureBand : "",
        payload: record.payload,
        savedAt: record.savedAt,
        syncState,
        ...(typeof record.lastSyncAttemptAt === "string"
          ? { lastSyncAttemptAt: record.lastSyncAttemptAt }
          : {}),
        ...(typeof record.syncedAt === "string" ? { syncedAt: record.syncedAt } : {}),
      }];
    });
  } catch {
    return [];
  }
}

function writeLocal(list: ChemicalRaSavedRecord[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 100)));
    return true;
  } catch {
    return false;
  }
}

function persistRecord(record: ChemicalRaSavedRecord): boolean {
  return writeLocal(upsertRecord(readLocal(), record));
}

async function sendRecordToCloud(
  record: ChemicalRaSavedRecord,
): Promise<"synced" | "failed"> {
  try {
    const response = await fetch("/api/chemical/ra-records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ record, cloudConsent: true }),
    });
    if (!response.ok) return "failed";
    const body = (await response.json().catch(() => null)) as { ok?: unknown } | null;
    return body?.ok === true ? "synced" : "failed";
  } catch {
    return "failed";
  }
}

// ── 公開API ─────────────────────────────────────────────────
/** RA結果を保存（localStorage 即時＋クラウド背景同期）。raId を返す。 */
export async function saveChemicalRaRecord(
  input: Omit<
    ChemicalRaSavedRecord,
    "raId" | "savedAt" | "syncState" | "lastSyncAttemptAt" | "syncedAt"
  > & {
    raId?: string;
    cloudConsent?: boolean;
  }
): Promise<ChemicalRaSaveResult> {
  const raId = input.raId?.trim() || `ra_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const savedAt = new Date().toISOString();
  const rec: ChemicalRaSavedRecord = {
    raId,
    cas: input.cas,
    substance: input.substance,
    workContent: input.workContent,
    exposureBand: input.exposureBand,
    // 保存時に値を複製し、呼び出し側の後続変更から切り離す。
    payload: finalizePayload(input.payload, savedAt),
    savedAt,
    syncState:
      input.cloudConsent === true
        ? isChemicalRaCloudEnabled()
          ? "sync-pending"
          : "failed"
        : "saved-locally",
  };
  const localSaved = persistRecord(rec);
  if (!localSaved) {
    return { raId, localStatus: "failed", cloudStatus: "not-requested" };
  }

  if (input.cloudConsent !== true) {
    return { raId, localStatus: "saved-locally", cloudStatus: "not-requested" };
  }
  if (!isChemicalRaCloudEnabled()) {
    return { raId, localStatus: "saved-locally", cloudStatus: "not-configured" };
  }
  const attemptedAt = new Date().toISOString();
  const cloudState = await sendRecordToCloud(rec);
  const updated: ChemicalRaSavedRecord = {
    ...rec,
    syncState: cloudState,
    lastSyncAttemptAt: attemptedAt,
    ...(cloudState === "synced" ? { syncedAt: attemptedAt } : {}),
  };
  persistRecord(updated);
  return {
    raId,
    localStatus: "saved-locally",
    cloudStatus: cloudState,
  };
}

/** 保存一覧を取得（クラウド＋ローカルをマージ。クラウド未設定・失敗はローカルのみ）。 */
export async function listChemicalRaRecords(cloudConsent = false): Promise<ChemicalRaSavedRecord[]> {
  let local = readLocal();
  if (!cloudConsent || !isChemicalRaCloudEnabled()) return local;
  // 明示同意がある再接続時だけ、未完了/失敗レコードを実レスポンスで再判定する。
  for (const record of local
    .filter((item) => item.syncState === "sync-pending" || item.syncState === "failed")
    .slice(0, 20)) {
    const attemptedAt = new Date().toISOString();
    const cloudState = await sendRecordToCloud(record);
    persistRecord({
      ...record,
      syncState: cloudState,
      lastSyncAttemptAt: attemptedAt,
      ...(cloudState === "synced" ? { syncedAt: attemptedAt } : {}),
    });
  }
  local = readLocal();
  try {
    const res = await fetch("/api/chemical/ra-records", {
      headers: { "x-cloud-consent": "chemical-ra" },
    });
    if (!res.ok) return local;
    const data: unknown = await res.json();
    const cloud = Array.isArray((data as { list?: unknown })?.list)
      ? ((data as { list: ChemicalRaSavedRecord[] }).list).map((record) => ({
          ...record,
          syncState: "synced" as const,
          syncedAt: record.syncedAt ?? record.savedAt,
        }))
      : [];
    const merged = mergeRecords(local, cloud);
    writeLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

/** raId で1件取得（クラウド＋ローカルのマージ結果から検索）。台帳からの再表示・再印刷用。 */
export async function getChemicalRaRecord(raId: string): Promise<ChemicalRaSavedRecord | null> {
  const id = raId.trim();
  if (!id) return null;
  const list = await listChemicalRaRecords(false);
  return list.find((r) => r.raId === id) ?? null;
}

/** 1件削除（localStorage＋クラウド）。 */
export async function deleteChemicalRaRecord(raId: string, cloudConsent = false): Promise<void> {
  writeLocal(readLocal().filter((r) => r.raId !== raId));
  if (cloudConsent && isChemicalRaCloudEnabled()) {
    try {
      const response = await fetch(
        `/api/chemical/ra-records?id=${encodeURIComponent(raId)}`,
        { method: "DELETE", headers: { "x-cloud-consent": "chemical-ra" } }
      );
      if (!response.ok) throw new Error("cloud_delete_failed");
    } catch {
      throw new Error("端末内は削除しましたが、クラウド削除を確認できませんでした。");
    }
  }
}
