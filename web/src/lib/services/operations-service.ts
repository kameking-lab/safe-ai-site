import type { ServiceResult } from "@/lib/types/api";
import type {
  KyPaperFormState,
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
} as const;

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

const defaultKySheetDraft: KySheetDraft = {
  date: todayISODate(),
  siteName: "",
  workSummary: "",
  expectedRisks: "",
  countermeasures: "",
  callAndResponse: "",
  notes: "",
};

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

const defaultKyPaperForm: KyPaperFormState = {
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

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as Record<string, unknown>) } as T;
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
      return { ok: true, data: readFromStorage(STORAGE_KEYS.ky, defaultKySheetDraft) };
    },
    async saveKyDraft(value) {
      writeToStorage(STORAGE_KEYS.ky, value);
      return { ok: true, data: value };
    },
    async getKyPaperForm() {
      return { ok: true, data: readFromStorage(STORAGE_KEYS.kyPaper, defaultKyPaperForm) };
    },
    async saveKyPaperForm(value) {
      writeToStorage(STORAGE_KEYS.kyPaper, value);
      return { ok: true, data: value };
    },
    async buildMailPreview({ notification, mail }) {
      const lines = [
        "【安全AIサイト】配信サンプル",
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
