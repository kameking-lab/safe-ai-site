import { summaryMockByRevisionId } from "@/data/mock/summaries";
import type {
  ApiForceErrorType,
  ApiErrorResponse,
  ServiceResult,
  SummaryApiRequest,
  SummaryApiResponse,
  SummaryApiRouteResponse,
} from "@/lib/types/api";

export type SummaryService = {
  getSummaryByRevisionId: (
    input: SummaryApiRequest,
    options?: { forceError?: ApiForceErrorType; delayMs?: number }
  ) => Promise<ServiceResult<SummaryApiResponse>>;
};

type FetchWithTimeout = (
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
) => Promise<Response>;

async function getSummaryByRevisionIdMock(
  input: SummaryApiRequest
): Promise<ServiceResult<SummaryApiResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  const summary = summaryMockByRevisionId[input.revisionId];
  if (summary) {
    return {
      ok: true,
      data: {
        revisionId: input.revisionId,
        summary,
      },
    };
  }

  // 事前要約が無い場合も /api/summaries のAIフォールバックへ委譲
  try {
    const res = await fetch(`/api/summaries?revisionId=${encodeURIComponent(input.revisionId)}`);
    if (res.ok) {
      const data = (await res.json()) as { ok: true; data: SummaryApiResponse } | { ok: false; error: { code: "NOT_FOUND" | "VALIDATION" | "UNAVAILABLE" | "NETWORK"; message: string; retryable: boolean } };
      if (data.ok) {
        return { ok: true, data: data.data };
      }
      return { ok: false, error: data.error };
    }
  } catch {
    // fall through
  }
  return {
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "要約データが見つかりませんでした。時間をおいて再試行するか、/law-search のAI要約もお試しください。",
      retryable: true,
    },
  };
}

export const mockSummaryService: SummaryService = {
  getSummaryByRevisionId: getSummaryByRevisionIdMock,
};

export class ApiSummaryService implements SummaryService {
  constructor(
    private readonly fetchImpl: FetchWithTimeout,
    private readonly endpoint = "/api/summaries"
  ) {}

  async getSummaryByRevisionId(
    input: SummaryApiRequest,
    options?: { forceError?: ApiForceErrorType; delayMs?: number }
  ): Promise<ServiceResult<SummaryApiResponse>> {
    try {
      const query = new URLSearchParams({ revisionId: input.revisionId });
      if (options?.forceError) {
        query.set("forceError", options.forceError);
      }
      if (typeof options?.delayMs === "number") {
        query.set("delayMs", String(options.delayMs));
      }
      const response = await this.fetchImpl(`${this.endpoint}?${query.toString()}`, {
        timeoutMs: 4500,
      });
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as ApiErrorResponse | null;
        if (errorBody?.error) {
          return {
            ok: false,
            error: {
              ...errorBody.error,
              retryable: errorBody.error.retryable ?? response.status >= 500,
            },
          };
        }
        return {
          ok: false,
          error: {
            code: response.status >= 500 ? "UNAVAILABLE" : "NETWORK",
            message:
              response.status >= 500
                ? "要約APIが一時的に利用できません。時間をおいて再試行してください。"
                : "要約の取得に失敗しました。時間をおいて再試行してください。",
            retryable: true,
          },
        };
      }

      const payload = (await response.json()) as SummaryApiRouteResponse;
      if (!payload.ok) {
        return {
          ok: false,
          error: payload.error,
        };
      }
      return {
        ok: true,
        data: payload.data,
      };
    } catch {
      return {
        ok: false,
        error: {
          code: "NETWORK",
          message: "要約取得がタイムアウトまたはネットワークエラーになりました。再試行してください。",
          retryable: true,
        },
      };
    }
  }
}

export function createMockSummaryService(): SummaryService {
  return mockSummaryService;
}

export function createApiSummaryService(
  fetchImpl: FetchWithTimeout = (input, init) => fetch(input, init),
  endpoint?: string
): SummaryService {
  return new ApiSummaryService(fetchImpl, endpoint);
}
