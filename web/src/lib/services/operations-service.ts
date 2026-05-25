import type { ServiceResult } from "@/lib/types/api";
import type {
  KyInstructionRecordState,
  KyPaperFormState,
  KyRecordSummary,
  KySheetDraft,
  MailDeliverySettings,
  NotificationSettings,
  PdfExportTarget,
} from "@/lib/types/operations";

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

function emptyRiskRow(label: string): KyInstructionRecordState["riskRows"][number] {
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

function emptyParticipant(): KyInstructionRecordState["participants"][number] {
  return { name: "", qualNo: "", preWork: "", onExit: "" };
}

function buildDefaultKyInstructionRecord(): KyInstructionRecordState {
  const d = new Date();
  return {
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

export function normalizeKyInstructionRecord(raw: unknown): KyInstructionRecordState {
  const base = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Partial<KyInstructionRecordState>;
  const merged: KyInstructionRecordState = { ...buildDefaultKyInstructionRecord(), ...base };
  const workRows = ensureArray<KyInstructionRecordState["workRows"][number]>(merged.workRows, []);
  if (workRows.length < 4) {
    while (workRows.length < 4) workRows.push(emptyWorkRow());
  }
  const riskLabels = ["上記", "①", "②", "③", "④"];
  const riskRows = ensureArray<KyInstructionRecordState["riskRows"][number]>(merged.riskRows, []);
  if (riskRows.length < 5) {
    while (riskRows.length < 5) riskRows.push(emptyRiskRow(riskLabels[riskRows.length] ?? `(${riskRows.length})`));
  }
  const participants = ensureArray<KyInstructionRecordState["participants"][number]>(merged.participants, []);
  if (participants.length < 6) {
    while (participants.length < 6) participants.push(emptyParticipant());
  }
  const fallChecks = ensureArray<KyInstructionRecordState["fallChecks"][number]>(merged.fallChecks, []);
  if (fallChecks.length < 3) {
    while (fallChecks.length < 3) fallChecks.push({ good: "", bad: "", done: "" });
  }
  const breaks = ensureArray<string>(merged.breaks, ["", "", "", "", ""]);
  while (breaks.length < 5) breaks.push("");
  const reportStamps = ensureArray<string>(merged.reportStamps, ["", "", "", "", ""]);
  while (reportStamps.length < 5) reportStamps.push("");
  return {
    ...merged,
    workRows,
    riskRows,
    participants,
    fallChecks,
    breaks,
    reportStamps: reportStamps.slice(0, 5) as [string, string, string, string, string],
  };
}

/**
 * KY記録から一覧用サマリーを生成する純粋関数。
 * localStorage 保存（下記 saveKyInstructionRecord）と、クラウド API（/api/ky/records）の
 * 両方で同じ導出ロジックを共有するために切り出した（Phase 4）。
 */
export function buildKyRecordSummary(
  record: KyInstructionRecordState,
  opts: { id?: string; savedAt?: string } = {}
): KyRecordSummary {
  const normalized = normalizeKyInstructionRecord(record);
  const pad = (s: string) => String(s ?? "").padStart(2, "0");
  return {
    id: opts.id ?? Date.now().toString(),
    workDate: `${normalized.workDateYear}-${pad(normalized.workDateMonth)}-${pad(normalized.workDateDay)}`,
    companyName: normalized.coop1Name || normalized.coop2Name || normalized.coop3Name || "未入力",
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
      return ensureArray(parsed, fallback as unknown as unknown[]) as unknown as T;
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
  saveNotificationSettings: (value: NotificationSettings) => Promise<ServiceResult<NotificationSettings>>;
  getMailSettings: () => Promise<ServiceResult<MailDeliverySettings>>;
  saveMailSettings: (value: MailDeliverySettings) => Promise<ServiceResult<MailDeliverySettings>>;
  getKyDraft: () => Promise<ServiceResult<KySheetDraft>>;
  saveKyDraft: (value: KySheetDraft) => Promise<ServiceResult<KySheetDraft>>;
  getKyPaperForm: () => Promise<ServiceResult<KyPaperFormState>>;
  saveKyPaperForm: (value: KyPaperFormState) => Promise<ServiceResult<KyPaperFormState>>;
  getKyInstructionRecord: () => Promise<ServiceResult<KyInstructionRecordState>>;
  saveKyInstructionRecord: (value: KyInstructionRecordState) => Promise<ServiceResult<KyInstructionRecordState>>;
  getKyRecordList: () => Promise<ServiceResult<KyRecordSummary[]>>;
  getKyRecordById: (id: string) => Promise<ServiceResult<KyInstructionRecordState | null>>;
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
      return { ok: true, data: readFromStorage(STORAGE_KEYS.notification, defaultNotificationSettings) };
    },
    async saveNotificationSettings(value) {
      writeToStorage(STORAGE_KEYS.notification, value);
      return { ok: true, data: value };
    },
    async getMailSettings() {
      return { ok: true, data: readFromStorage(STORAGE_KEYS.mail, defaultMailSettings) };
    },
    async saveMailSettings(value) {
      writeToStorage(STORAGE_KEYS.mail, value);
      return { ok: true, data: value };
    },
    async getKyDraft() {
      return { ok: true, data: readFromStorage(STORAGE_KEYS.ky, buildDefaultKySheetDraft()) };
    },
    async saveKyDraft(value) {
      writeToStorage(STORAGE_KEYS.ky, value);
      return { ok: true, data: value };
    },
    async getKyPaperForm() {
      return { ok: true, data: readFromStorage(STORAGE_KEYS.kyPaper, buildDefaultKyPaperForm()) };
    },
    async saveKyPaperForm(value) {
      writeToStorage(STORAGE_KEYS.kyPaper, value);
      return { ok: true, data: value };
    },
    async getKyInstructionRecord() {
      const raw = readFromStorage(STORAGE_KEYS.kyInstruction, buildDefaultKyInstructionRecord());
      return { ok: true, data: normalizeKyInstructionRecord(raw) };
    },
    async saveKyInstructionRecord(value) {
      try {
        const normalized = normalizeKyInstructionRecord(value);
        writeToStorage(STORAGE_KEYS.kyInstruction, normalized);
        // 一覧に追加
        const list = readFromStorage<KyRecordSummary[]>(STORAGE_KEYS.kyList, []);
        const safeList = Array.isArray(list) ? list : [];
        const summary = buildKyRecordSummary(normalized);
        const updated = [summary, ...safeList].slice(0, MAX_KY_LIST);
        writeToStorage(STORAGE_KEYS.kyList, updated);
        // P0-A: 個別の再編集・複製用に full record を id 別マップへ保存（一覧の id に合わせて剪定）。
        const byId = readFromStorage<Record<string, KyInstructionRecordState>>(STORAGE_KEYS.kyById, {});
        const safeById = byId && typeof byId === "object" && !Array.isArray(byId) ? { ...byId } : {};
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
      const byId = readFromStorage<Record<string, KyInstructionRecordState>>(STORAGE_KEYS.kyById, {});
      const rec = byId && typeof byId === "object" && !Array.isArray(byId) ? byId[id] : undefined;
      return { ok: true, data: rec ? normalizeKyInstructionRecord(rec) : null };
    },
    async deleteKyRecord(id) {
      const list = readFromStorage<KyRecordSummary[]>(STORAGE_KEYS.kyList, []);
      const safeList = Array.isArray(list) ? list : [];
      const updated = safeList.filter((r) => r.id !== id);
      writeToStorage(STORAGE_KEYS.kyList, updated);
      const byId = readFromStorage<Record<string, KyInstructionRecordState>>(STORAGE_KEYS.kyById, {});
      if (byId && typeof byId === "object" && !Array.isArray(byId) && id in byId) {
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
        data: ["朝礼要点（PDF出力プレビュー）", ...briefingLines.map((line) => `- ${line}`)].join("\n"),
      };
    },
  };
}
