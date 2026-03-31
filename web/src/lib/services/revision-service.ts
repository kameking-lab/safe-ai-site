import { lawRevisionCores } from "@/data/mock/law-revisions";
import type {
  RevisionListApiResponse,
  ServiceError,
  ServiceResult,
  ApiErrorResponse,
} from "@/lib/types/api";
import type { LawRevision } from "@/lib/types/domain";

export type RevisionService = {
  getCachedRevisions: () => LawRevision[];
  getInitialRevisionId: () => string | null;
  getLawRevisions: (options?: { forceError?: string }) => Promise<ServiceResult<LawRevision[]>>;
};

type FetchWithTimeout = (
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
) => Promise<Response>;

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
        data: lawRevisionCores,
      };
    },
  };
}

export function createApiRevisionService(
  fetchImpl: FetchWithTimeout = fetch,
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
        const target = endpoint.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
        const response = await fetchImpl(target, { timeoutMs: 3500 });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as unknown;
          const parsed = parseErrorResponse(body);
          if (parsed) {
            return { ok: false, error: parsed };
          }
          return {
            ok: false,
            error: {
              code: response.status >= 500 ? "UNAVAILABLE" : "NETWORK",
              message:
                response.status >= 500
                  ? "法改正一覧APIが一時的に利用できません。"
                  : "法改正一覧の取得に失敗しました。",
              retryable: true,
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
