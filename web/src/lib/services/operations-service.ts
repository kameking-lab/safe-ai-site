import type { ServiceResult } from "@/lib/types/api";
import type {
  KyInstructionRecordState,
  KyInstructionRiskRow,
  KyPaperFormState,
  KyRecordSummary,
  KySheetDraft,
  MailDeliverySettings,
  NotificationSettings,
  PdfExportTarget,
  KyRiskCandidateSourceKind,
} from "@/lib/types/operations";
import { normalizeApproval } from "@/lib/ky/approval";
import { validateKyForTransition } from "@/lib/ky/readiness";
import { kyContentRevision } from "@/lib/ky/revision";

const STORAGE_KEYS = {
  notification: "safe-ai:notification-settings:v1",
  mail: "safe-ai:mail-settings:v1",
  ky: "safe-ai:ky-sheet:v1",
  kyPaper: "safe-ai:ky-paper:v1",
  kyInstruction: "safe-ai:ky-instruction-record:v1",
  kyList: "safe-ai:ky-record-list:v1",
  kyById: "safe-ai:ky-records-by-id:v1",
} as const;

const MAX_KY_LIST = 30;

const defaultNotificationSettings: NotificationSettings = {
  weatherAlerts: true,
  lawRevisions: true,
  accidentUpdates: true,
  morningReminder: false,
  reminderTime: "07:45",
};

const defaultMailSettings: MailDeliverySettings = {
  enabled: false,
  email: "",
  frequency: "daily",
  includeWeather: true,
  includeLaws: true,
  includeAccidents: true,
  includeLearning: false,
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// 重要: date は毎回呼び出し時に評価する（モジュール初期化時に固定すると
// Next.js の build/SSR キャッシュで日付が固定化されるため）
function buildDefaultKySheetDraft(): KySheetDraft {
  return {
    date: todayISODate(),
    siteName: "",
    workSummary: "",
    expectedRisks: "",
    countermeasures: "",
    callAndResponse: "",
    notes: "",
  };
}

function emptyKyPaperRow() {
  return {
    predictedHarm: "",
    magnitude: 1,
    probability: 1,
    evaluation: 1,
    riskGrade: "D",
    reductionMeasures: "",
    reMagnitude: 1,
    reProbability: 1,
    reEvaluation: 1,
    reRiskGrade: "D",
    reMeasures: "",
  };
}

function buildDefaultKyPaperForm(): KyPaperFormState {
  return {
    date: todayISODate(),
    companyName: "",
    personInCharge: "",
    workContent: "",
    supervisorInstructions: "",
    rows: [emptyKyPaperRow(), emptyKyPaperRow()],
    participantNames: "",
    pointingCall: "",
    siteAgentSign: "",
    supervisorSign: "",
  };
}

function emptyWorkRow(): KyInstructionRecordState["workRows"][number] {
  return {
    workPlace: "",
    workDetail: "",
    machinery: "",
    fireMark: "",
    heightMark: "",
    ppeNote: "",
    safetyInstruction: "",
    responsible: "",
    primeSign: "",
  };
}

const RISK_ROW_LABELS = ["上記", "①", "②", "③", "④"];
const KY_RISK_SOURCE_KINDS = new Set<KyRiskCandidateSourceKind>([
  "ai",
  "rule",
  "officialAccident",
  "curatedAccident",
  "syntheticCase",
  "preliminaryCase",
  "workflowImport",
]);

function emptyRiskRow(
  label: string,
): KyInstructionRecordState["riskRows"][number] {
  return {
    targetLabel: label,
    hazard: "",
    qualNo: "",
    likelihood: 1,
    severity: 1,
    reduction: "",
    reLikelihood: 1,
    reSeverity: 1,
    reducedBelow2: "",
    primeSign: "",
  };
}

/** O10（続き）: 危険行の「＋行追加」ホットスポット用。既定5行を超えた行にも同じ採番規則を適用する。 */
export function makeEmptyKyRiskRow(
  index: number,
): KyInstructionRecordState["riskRows"][number] {
  return emptyRiskRow(RISK_ROW_LABELS[index] ?? `(${index})`);
}

function normalizeKyRiskRow(
  value: KyInstructionRiskRow,
  index: number,
): KyInstructionRiskRow {
  const row = {
    ...emptyRiskRow(RISK_ROW_LABELS[index] ?? `(${index})`),
    ...value,
  };
  const source =
    value.candidateSource && typeof value.candidateSource === "object"
      ? value.candidateSource
      : null;
  const sourceKind = source?.kind as KyRiskCandidateSourceKind | undefined;
  const referenceUrl =
    typeof source?.referenceUrl === "string" &&
    source.referenceUrl.startsWith("https://")
      ? source.referenceUrl
      : undefined;
  const basis =
    typeof source?.basis === "string" && source.basis.trim()
      ? source.basis.trim().slice(0, 1_000)
      : undefined;
  const retrievedExampleIds = Array.isArray(source?.retrievedExampleIds)
    ? source.retrievedExampleIds
        .filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0,
        )
        .slice(0, 10)
        .map((id) => id.trim().slice(0, 100))
    : [];
  const sourceUrls = Array.isArray(source?.sourceUrls)
    ? source.sourceUrls
        .filter(
          (url): url is string =>
            typeof url === "string" && url.startsWith("https://"),
        )
        .slice(0, 10)
    : [];
  const generatedAt =
    typeof source?.generatedAt === "string" &&
    Number.isFinite(Date.parse(source.generatedAt))
      ? source.generatedAt
      : undefined;
  const candidateSource =
    sourceKind &&
    KY_RISK_SOURCE_KINDS.has(sourceKind) &&
    typeof source?.label === "string" &&
    source.label.trim()
      ? {
          kind: sourceKind,
          label: source.label.trim(),
          ...(typeof source.referenceId === "string" &&
          source.referenceId.trim()
            ? { referenceId: source.referenceId.trim() }
            : {}),
          ...(referenceUrl ? { referenceUrl } : {}),
          ...(basis ? { basis } : {}),
          ...(typeof source.grounded === "boolean"
            ? { grounded: source.grounded }
            : {}),
          ...(retrievedExampleIds.length > 0 ? { retrievedExampleIds } : {}),
          ...(sourceUrls.length > 0 ? { sourceUrls } : {}),
          ...(generatedAt ? { generatedAt } : {}),
          requiresHumanReview: true as const,
        }
      : undefined;
  const humanConfirmedAt =
    candidateSource &&
    typeof value.humanConfirmedAt === "string" &&
    Number.isFinite(Date.parse(value.humanConfirmedAt))
      ? value.humanConfirmedAt
      : undefined;
  return {
    ...row,
    ...(candidateSource ? { candidateSource } : { candidateSource: undefined }),
    ...(humanConfirmedAt
      ? { humanConfirmedAt }
      : { humanConfirmedAt: undefined }),
  };
}

function emptyParticipant(): KyInstructionRecordState["participants"][number] {
  return { name: "", qualNo: "", preWork: "", onExit: "" };
}

function buildDefaultKyInstructionRecord(): KyInstructionRecordState {
  const d = new Date();
  return {
    schemaVersion: 2,
    createdAt: "",
    applicableDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    context: {
      workLocation: "",
      equipment: "",
      heavyEquipment: "",
      plannedPeopleCount: "",
      weather: "",
      simultaneousWork: "",
      changes: "",
      newEntrants: "",
      nightWork: "",
      chemicals: "",
      heatStress: "",
      reviewerName: "",
    },
    reportStamps: ["", "", "", "", ""],
    siteName: "",
    projectName: "",
    foremanName: "",
    workDateYear: d.getFullYear().toString(),
    workDateMonth: String(d.getMonth() + 1),
    workDateDay: String(d.getDate()),
    workDateNote: "",
    weather: "",
    temperature: "",
    coop1Name: "",
    coop1Chief: "",
    coop2Name: "",
    coop2Chief: "",
    coop3Name: "",
    coop3Chief: "",
    workRows: [emptyWorkRow(), emptyWorkRow(), emptyWorkRow(), emptyWorkRow()],
    riskRows: [
      emptyRiskRow("上記"),
      emptyRiskRow("①"),
      emptyRiskRow("②"),
      emptyRiskRow("③"),
      emptyRiskRow("④"),
    ],
    participants: Array.from({ length: 6 }, () => emptyParticipant()),
    participantTotal: "",
    breaks: ["", "", "", "", ""],
    safetyVest: "",
    exitLarge: "",
    exitMedium: "",
    exitSmall: "",
    closingNote: "",
    fallChecks: [
      { good: "", bad: "", done: "" },
      { good: "", bad: "", done: "" },
      { good: "", bad: "", done: "" },
    ],
    correctionNote: "",
    teamGoal: "",
    priorityItems: "",
    pointingCall: "",
  };
}

function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    const numeric = keys.every((k) => /^\d+$/.test(k));
    if (numeric && keys.length > 0) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => (value as Record<string, unknown>)[k]) as T[];
    }
  }
  return fallback;
}

export function normalizeKyInstructionRecord(
  raw: unknown,
): KyInstructionRecordState {
  const base = (
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  ) as Partial<KyInstructionRecordState>;
  const merged: KyInstructionRecordState = {
    ...buildDefaultKyInstructionRecord(),
    ...base,
  };
  const workRows = ensureArray<KyInstructionRecordState["workRows"][number]>(
    merged.workRows,
    [],
  ).map((row) => ({ ...emptyWorkRow(), ...row }));
  if (workRows.length < 4) {
    while (workRows.length < 4) workRows.push(emptyWorkRow());
  }
  const riskRows = ensureArray<KyInstructionRecordState["riskRows"][number]>(
    merged.riskRows,
    [],
  ).map(normalizeKyRiskRow);
  if (riskRows.length < 5) {
    while (riskRows.length < 5)
      riskRows.push(
        emptyRiskRow(
          RISK_ROW_LABELS[riskRows.length] ?? `(${riskRows.length})`,
        ),
      );
  }
  const participants = ensureArray<
    KyInstructionRecordState["participants"][number]
  >(merged.participants, []);
  if (participants.length < 6) {
    while (participants.length < 6) participants.push(emptyParticipant());
  }
  const fallChecks = ensureArray<
    KyInstructionRecordState["fallChecks"][number]
  >(merged.fallChecks, []);
  if (fallChecks.length < 3) {
    while (fallChecks.length < 3)
      fallChecks.push({ good: "", bad: "", done: "" });
  }
  const breaks = ensureArray<string>(merged.breaks, ["", "", "", "", ""]);
  while (breaks.length < 5) breaks.push("");
  const reportStamps = ensureArray<string>(merged.reportStamps, [
    "",
    "",
    "",
    "",
    "",
  ]);
  while (reportStamps.length < 5) reportStamps.push("");
  const rawContext =
    base.context && typeof base.context === "object"
      ? (base.context as Partial<KyInstructionRecordState["context"]>)
      : {};
  const firstWorkRow = workRows.find(
    (row) => row.workPlace?.trim() || row.machinery?.trim(),
  );
  const safeContextValue = (value: unknown, fallback = "") =>
    typeof value === "string" ? value.slice(0, 1_000) : fallback;
  const context: KyInstructionRecordState["context"] = {
    workLocation: safeContextValue(
      rawContext.workLocation,
      firstWorkRow?.workPlace ?? "",
    ),
    equipment: safeContextValue(
      rawContext.equipment,
      firstWorkRow?.machinery ?? "",
    ),
    heavyEquipment: safeContextValue(rawContext.heavyEquipment),
    plannedPeopleCount: safeContextValue(
      rawContext.plannedPeopleCount,
      merged.participantTotal,
    ),
    weather: safeContextValue(rawContext.weather, merged.weather),
    simultaneousWork: safeContextValue(rawContext.simultaneousWork),
    changes: safeContextValue(rawContext.changes),
    newEntrants: safeContextValue(rawContext.newEntrants),
    nightWork: safeContextValue(rawContext.nightWork),
    chemicals: safeContextValue(rawContext.chemicals),
    heatStress: safeContextValue(rawContext.heatStress),
    reviewerName: safeContextValue(rawContext.reviewerName),
    ...(typeof rawContext.reviewedAt === "string" &&
    Number.isFinite(Date.parse(rawContext.reviewedAt))
      ? { reviewedAt: rawContext.reviewedAt }
      : {}),
  };
  const normalized: KyInstructionRecordState = {
    ...merged,
    schemaVersion: 2,
    createdAt:
      typeof base.createdAt === "string" &&
      Number.isFinite(Date.parse(base.createdAt))
        ? base.createdAt
        : "",
    applicableDate:
      typeof base.applicableDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(base.applicableDate)
        ? base.applicableDate
        : merged.applicableDate,
    context,
    workRows,
    riskRows,
    participants,
    fallChecks,
    breaks,
    reportStamps: reportStamps.slice(0, 5) as [
      string,
      string,
      string,
      string,
      string,
    ],
    approval: normalizeApproval(merged.approval),
  };
  const approvalRevisionCurrent =
    normalized.approval?.status === "submitted"
      ? normalized.approval.submittedRevision ===
        kyContentRevision(normalized)
      : normalized.approval?.status === "approved"
        ? normalized.approval.approvedRevision ===
          kyContentRevision(normalized)
        : true;
  if (
    (normalized.approval?.status === "submitted" ||
      normalized.approval?.status === "approved") &&
    (validateKyForTransition(normalized).length > 0 ||
      !approvalRevisionCurrent)
  ) {
    normalized.approval = {
      status: "draft",
      history: normalized.approval.history,
    };
  }
  return normalized;
}

/**
 * KY記録から一覧用サマリーを生成する純粋関数。
 * localStorage 保存（下記 saveKyInstructionRecord）と、クラウド API（/api/ky/records）の
 * 両方で同じ導出ロジックを共有するために切り出した（Phase 4）。
 */
export function buildKyRecordSummary(
  record: KyInstructionRecordState,
  opts: { id?: string; savedAt?: string } = {},
): KyRecordSummary {
  const normalized = normalizeKyInstructionRecord(record);
  const pad = (s: string) => String(s ?? "").padStart(2, "0");
  return {
    id: opts.id ?? Date.now().toString(),
    workDate: `${normalized.workDateYear}-${pad(normalized.workDateMonth)}-${pad(normalized.workDateDay)}`,
    companyName:
      normalized.coop1Name ||
      normalized.coop2Name ||
      normalized.coop3Name ||
      "未入力",
    siteName: normalized.siteName || "",
    projectName: normalized.projectName || "",
    foremanName: normalized.foremanName || "",
    workDetail: normalized.workRows[0]?.workDetail || "未入力",
    weather: normalized.weather || "未入力",
    savedAt: opts.savedAt ?? new Date().toISOString(),
  };
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return ensureArray(
        parsed,
        fallback as unknown as unknown[],
      ) as unknown as T;
    }
    if (parsed && typeof parsed === "object") {
      return { ...fallback, ...(parsed as Record<string, unknown>) } as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export type OperationsService = {
  getNotificationSettings: () => Promise<ServiceResult<NotificationSettings>>;
  saveNotificationSettings: (
    value: NotificationSettings,
  ) => Promise<ServiceResult<NotificationSettings>>;
  getMailSettings: () => Promise<ServiceResult<MailDeliverySettings>>;
  saveMailSettings: (
    value: MailDeliverySettings,
  ) => Promise<ServiceResult<MailDeliverySettings>>;
  getKyDraft: () => Promise<ServiceResult<KySheetDraft>>;
  saveKyDraft: (value: KySheetDraft) => Promise<ServiceResult<KySheetDraft>>;
  getKyPaperForm: () => Promise<ServiceResult<KyPaperFormState>>;
  saveKyPaperForm: (
    value: KyPaperFormState,
  ) => Promise<ServiceResult<KyPaperFormState>>;
  getKyInstructionRecord: () => Promise<
    ServiceResult<KyInstructionRecordState>
  >;
  saveKyInstructionRecord: (
    value: KyInstructionRecordState,
  ) => Promise<ServiceResult<KyInstructionRecordState>>;
  getKyRecordList: () => Promise<ServiceResult<KyRecordSummary[]>>;
  getKyRecordById: (
    id: string,
  ) => Promise<ServiceResult<KyInstructionRecordState | null>>;
  deleteKyRecord: (id: string) => Promise<ServiceResult<KyRecordSummary[]>>;
  buildMailPreview: (input: {
    notification: NotificationSettings;
    mail: MailDeliverySettings;
  }) => Promise<ServiceResult<string>>;
  buildPdfPreview: (input: {
    target: PdfExportTarget;
    kyDraft: KySheetDraft;
    briefingLines: string[];
  }) => Promise<ServiceResult<string>>;
};

export function createOperationsService(): OperationsService {
  return {
    async getNotificationSettings() {
      return {
        ok: true,
        data: readFromStorage(
          STORAGE_KEYS.notification,
          defaultNotificationSettings,
        ),
      };
    },
    async saveNotificationSettings(value) {
      writeToStorage(STORAGE_KEYS.notification, value);
      return { ok: true, data: value };
    },
    async getMailSettings() {
      return {
        ok: true,
        data: readFromStorage(STORAGE_KEYS.mail, defaultMailSettings),
      };
    },
    async saveMailSettings(value) {
      writeToStorage(STORAGE_KEYS.mail, value);
      return { ok: true, data: value };
    },
    async getKyDraft() {
      return {
        ok: true,
        data: readFromStorage(STORAGE_KEYS.ky, buildDefaultKySheetDraft()),
      };
    },
    async saveKyDraft(value) {
      writeToStorage(STORAGE_KEYS.ky, value);
      return { ok: true, data: value };
    },
    async getKyPaperForm() {
      return {
        ok: true,
        data: readFromStorage(STORAGE_KEYS.kyPaper, buildDefaultKyPaperForm()),
      };
    },
    async saveKyPaperForm(value) {
      writeToStorage(STORAGE_KEYS.kyPaper, value);
      return { ok: true, data: value };
    },
    async getKyInstructionRecord() {
      const raw = readFromStorage(
        STORAGE_KEYS.kyInstruction,
        buildDefaultKyInstructionRecord(),
      );
      return { ok: true, data: normalizeKyInstructionRecord(raw) };
    },
    async saveKyInstructionRecord(value) {
      try {
        const normalized = normalizeKyInstructionRecord(value);
        writeToStorage(STORAGE_KEYS.kyInstruction, normalized);
        // 一覧に追加
        const list = readFromStorage<KyRecordSummary[]>(
          STORAGE_KEYS.kyList,
          [],
        );
        const safeList = Array.isArray(list) ? list : [];
        const summary = buildKyRecordSummary(normalized);
        const updated = [summary, ...safeList].slice(0, MAX_KY_LIST);
        writeToStorage(STORAGE_KEYS.kyList, updated);
        // P0-A: 個別の再編集・複製用に full record を id 別マップへ保存（一覧の id に合わせて剪定）。
        const byId = readFromStorage<Record<string, KyInstructionRecordState>>(
          STORAGE_KEYS.kyById,
          {},
        );
        const safeById =
          byId && typeof byId === "object" && !Array.isArray(byId)
            ? { ...byId }
            : {};
        safeById[summary.id] = normalized;
        const keepIds = new Set(updated.map((s) => s.id));
        const prunedById: Record<string, KyInstructionRecordState> = {};
        for (const k of Object.keys(safeById)) {
          if (keepIds.has(k)) prunedById[k] = safeById[k]!;
        }
        writeToStorage(STORAGE_KEYS.kyById, prunedById);
        return { ok: true, data: normalized };
      } catch (err) {
        return {
          ok: false,
          error: {
            code: "UNKNOWN",
            message: err instanceof Error ? err.message : "保存に失敗しました",
            retryable: true,
          },
        };
      }
    },
    async getKyRecordList() {
      const data = readFromStorage<KyRecordSummary[]>(STORAGE_KEYS.kyList, []);
      return { ok: true, data: Array.isArray(data) ? data : [] };
    },
    async getKyRecordById(id) {
      const byId = readFromStorage<Record<string, KyInstructionRecordState>>(
        STORAGE_KEYS.kyById,
        {},
      );
      const rec =
        byId && typeof byId === "object" && !Array.isArray(byId)
          ? byId[id]
          : undefined;
      return { ok: true, data: rec ? normalizeKyInstructionRecord(rec) : null };
    },
    async deleteKyRecord(id) {
      const list = readFromStorage<KyRecordSummary[]>(STORAGE_KEYS.kyList, []);
      const safeList = Array.isArray(list) ? list : [];
      const updated = safeList.filter((r) => r.id !== id);
      writeToStorage(STORAGE_KEYS.kyList, updated);
      const byId = readFromStorage<Record<string, KyInstructionRecordState>>(
        STORAGE_KEYS.kyById,
        {},
      );
      if (
        byId &&
        typeof byId === "object" &&
        !Array.isArray(byId) &&
        id in byId
      ) {
        const next = { ...byId };
        delete next[id];
        writeToStorage(STORAGE_KEYS.kyById, next);
      }
      return { ok: true, data: updated };
    },
    async buildMailPreview({ notification, mail }) {
      const lines = [
        "【安全AIポータル】配信プレビュー",
        `配信先: ${mail.email || "未設定"}`,
        `頻度: ${mail.frequency}`,
        "",
        "本日の配信対象",
        `- 警報・注意報: ${notification.weatherAlerts && mail.includeWeather ? "配信" : "対象外"}`,
        `- 法改正: ${notification.lawRevisions && mail.includeLaws ? "配信" : "対象外"}`,
        `- 事故DB更新: ${notification.accidentUpdates && mail.includeAccidents ? "配信" : "対象外"}`,
        `- 学習テーマ: ${mail.includeLearning ? "配信" : "対象外"}`,
      ];
      return { ok: true, data: lines.join("\n") };
    },
    async buildPdfPreview({ target, kyDraft, briefingLines }) {
      if (target === "ky-sheet") {
        return {
          ok: true,
          data: [
            "KY用紙（PDF出力プレビュー）",
            `日付: ${kyDraft.date}`,
            `現場名: ${kyDraft.siteName || "未入力"}`,
            `作業内容: ${kyDraft.workSummary || "未入力"}`,
            `想定危険: ${kyDraft.expectedRisks || "未入力"}`,
            `対策: ${kyDraft.countermeasures || "未入力"}`,
            `指差呼称: ${kyDraft.callAndResponse || "未入力"}`,
          ].join("\n"),
        };
      }
      return {
        ok: true,
        data: [
          "朝礼要点（PDF出力プレビュー）",
          ...briefingLines.map((line) => `- ${line}`),
        ].join("\n"),
      };
    },
  };
}
