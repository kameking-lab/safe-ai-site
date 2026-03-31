import type { RevisionSummary } from "@/lib/types/domain";
import type { LawRevision } from "@/lib/types/domain";

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
};

export type ChatApiResponse = {
  reply: string;
};

export type RevisionListApiResponse = {
  revisions: LawRevision[];
};

export type SummaryApiRouteResponse =
  | { ok: true; data: SummaryApiResponse }
  | { ok: false; error: ServiceError };
