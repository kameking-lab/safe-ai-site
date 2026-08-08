import type { RevisionSummary } from "@/lib/types/domain";
import type { LawRevision } from "@/lib/types/domain";
import type {
  ChatbotQuickReply,
  ChatbotSource,
} from "@/lib/chatbot-contract";
import type {
  OfficialWeatherWarningState,
  WeatherSnapshot,
} from "@/lib/types/domain";
import type { LegalConversationContext } from "@/lib/legal-conversation-context";

export type ApiMode = "mock" | "live";

export type ServiceStatus = "idle" | "loading" | "success" | "error";

export type ServiceErrorCode = "NETWORK" | "NOT_FOUND" | "UNAVAILABLE" | "VALIDATION" | "UNKNOWN";

export type ServiceError = {
  code: ServiceErrorCode;
  message: string;
  retryable: boolean;
};

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

export type ApiErrorResponse = {
  error: ServiceError;
};
export type ServiceErrorResponse = ApiErrorResponse;

export type ForceErrorType = "5xx" | "timeout" | "validation";
export type ApiForceErrorType = ForceErrorType;
export type ForceErrorTransport = "query" | "header";

export type ServiceErrorInjectionOptions = {
  revisions?: ApiForceErrorType;
  summaries?: ApiForceErrorType;
  chat?: ApiForceErrorType;
  revisionsDelayMs?: string;
  summaryDelayMs?: string;
  chatDelayMs?: string;
  useHeaderTransport?: boolean;
  envForceError?: ApiForceErrorType;
};

export type SummaryApiRequest = {
  revisionId: string;
};

export type SummaryApiResponse = {
  revisionId: string;
  summary: RevisionSummary;
};

export type ChatApiRequest = {
  revisionId: string;
  revisionTitle: string;
  question: string;
  privacyConfirmed: boolean;
  /** 同一画面の直近ターン。サーバーでは許可済み作業条件だけへ縮約する。 */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: LegalConversationContext;
};

export type ChatApiResponse = {
  reply: string;
  substantiveAnswer?: string;
  conditions?: string[];
  clarificationQuestion?: string | null;
  quickReplies?: ChatbotQuickReply[];
  sources?: ChatbotSource[];
  context?: LegalConversationContext;
};

export type RevisionListApiResponse = {
  revisions: LawRevision[];
};

export type SummaryApiRouteResponse =
  | { ok: true; data: SummaryApiResponse }
  | { ok: false; error: ServiceError };

export type WeatherRiskApiResponse = {
  snapshot: WeatherSnapshot;
  provider: "open-meteo";
  fetchedAt: string;
  officialWarning: OfficialWeatherWarningState;
  /** Open-Meteo current conditions. This is an estimated grid value, not JMA. */
  current?: {
    temperatureCelsius: number;
    relativeHumidityPercent: number;
    targetAt: string;
  };
};

export type WeatherRiskPartialApiResponse = ApiErrorResponse & {
  partial: true;
  fetchedAt: string;
  officialWarning: OfficialWeatherWarningState;
  unavailableSources: ["open-meteo"];
};
