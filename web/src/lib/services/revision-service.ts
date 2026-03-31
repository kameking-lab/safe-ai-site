import { lawRevisionCores } from "@/data/mock/law-revisions";
import type {
  ApiForceErrorType,
  RevisionListApiResponse,
  ServiceError,
  ServiceResult,
  ApiErrorResponse,
} from "@/lib/types/api";
import type { LawRevision } from "@/lib/types/domain";

export type RevisionService = {
  getCachedRevisions: () => LawRevision[];
  getInitialRevisionId: () => string | null;
  getLawRevisions: (
    options?: { forceError?: ApiForceErrorType; delayMs?: number }
  ) => Promise<ServiceResult<LawRevision[]>>;
};

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 3500
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function toUnknownError(message: string): ServiceError {
  return {
    code: "UNKNOWN",
    message,
    retryable: true,
  };
}

function toTimeoutError(): ServiceError {
  return {
    code: "NETWORK",
    message: "法改正一覧の取得がタイムアウトしました。再試行してください。",
    retryable: true,
  };
}

function parseErrorResponse(payload: unknown): ServiceError | null {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }
  const maybe = payload as ApiErrorResponse;
  if (!maybe.error?.code || !maybe.error?.message) {
    return null;
  }
  return {
    code: maybe.error.code,
    message: maybe.error.message,
    retryable: maybe.error.retryable ?? true,
  };
}

export function createMockRevisionService(): RevisionService {
  return {
    getCachedRevisions() {
      return lawRevisionCores;
    },
    getInitialRevisionId() {
      return lawRevisionCores[0]?.id ?? null;
    },
    async getLawRevisions() {
      return {
        ok: true,
        data: lawRevisionCores.map((revision) => ({
          id: revision.id,
          title: revision.title,
          publishedAt: revision.publishedAt,
          summary: revision.summary,
        })),
      };
    },
  };
}

export function createApiRevisionService(
  fetchImpl: typeof fetch = fetch,
  endpoint = "/api/revisions"
): RevisionService {
  const cachedFallback: LawRevision[] = lawRevisionCores;

  return {
    getCachedRevisions() {
      return cachedFallback;
    },
    getInitialRevisionId() {
      return cachedFallback[0]?.id ?? null;
    },
    async getLawRevisions(options) {
      try {
        const url = new URL(endpoint, "http://localhost");
        if (options?.forceError) {
          url.searchParams.set("forceError", options.forceError);
        }
        if (typeof options?.delayMs === "number") {
          url.searchParams.set("delayMs", String(options.delayMs));
        }
        const target = endpoint.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
        const response = await fetchWithTimeout(fetchImpl, target, {}, 3500);
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as unknown;
          const parsed = parseErrorResponse(body);
          if (parsed) {
            return { ok: false, error: parsed };
          }
          return {
            ok: false,
            error: {
              code: response.status >= 500 ? "UNAVAILABLE" : "VALIDATION",
              message:
                response.status >= 500
                  ? "法改正一覧APIが一時的に利用できません。"
                  : "法改正一覧APIの入力検証エラーです。",
              retryable: response.status >= 500,
            },
          };
        }
        const payload = (await response.json()) as RevisionListApiResponse;
        return {
          ok: true,
          data: payload.revisions,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return {
            ok: false,
            error: toTimeoutError(),
          };
        }
        return {
          ok: false,
          error: toUnknownError("法改正一覧の取得中に予期しないエラーが発生しました。"),
        };
      }
    },
  };
}
