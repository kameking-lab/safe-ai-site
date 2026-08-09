import type { RevisionSummary } from "@/lib/types/domain";
import type { LawRevision } from "@/lib/types/domain";
import type {
  ChatbotQuickReply,
  ChatbotResponse,
  ChatbotSource,
} from "@/lib/chatbot-contract";
import type {
  OfficialWeatherWarningState,
  WeatherSnapshot,
} from "@/lib/types/domain";
import type { PublicLegalConversationContext } from "@/lib/legal-conversation-public-context";

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
  /** @deprecated 旧clientの安全遮断だけに読み、回答文脈には利用しない。 */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: PublicLegalConversationContext;
};

export type ChatApiResponse = {
  reply: string;
  directAnswer: ChatbotResponse["directAnswer"];
  assumptions: ChatbotResponse["assumptions"];
  importantConditions: ChatbotResponse["importantConditions"];
  citations: ChatbotResponse["citations"];
  confidence: ChatbotResponse["confidence"];
  effectiveDateStatus: ChatbotResponse["effectiveDateStatus"];
  clarificationQuestion: ChatbotResponse["clarificationQuestion"];
  quickReplies: ChatbotQuickReply[];
  sources: ChatbotSource[];
  /** @deprecated directAnswer の読み取り互換エイリアス。 */
  substantiveAnswer?: string;
  /** @deprecated importantConditions の読み取り互換エイリアス。 */
  conditions?: string[];
  context?: PublicLegalConversationContext;
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
