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

  return {
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "要約データが見つかりませんでした。",
      retryable: false,
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
