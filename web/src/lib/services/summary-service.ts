import { summaryMockByRevisionId } from "@/data/mock/summaries";
import type { ServiceResult, SummaryApiRequest, SummaryApiResponse } from "@/lib/types/api";

export type SummaryService = {
  getSummaryByRevisionId: (input: SummaryApiRequest) => Promise<ServiceResult<SummaryApiResponse>>;
};

async function getSummaryByRevisionIdMock(
  input: SummaryApiRequest
): Promise<ServiceResult<SummaryApiResponse>> {
  await new Promise((resolve) => setTimeout(resolve, 650));
  const summary = summaryMockByRevisionId[input.revisionId];
  if (!summary) {
    return {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "要約データが見つかりませんでした。",
        retryable: false,
      },
    };
  }

  return {
    ok: true,
    data: {
      revisionId: input.revisionId,
      summary,
    },
  };
}

export const mockSummaryService: SummaryService = {
  getSummaryByRevisionId: getSummaryByRevisionIdMock,
};

export class ApiSummaryService implements SummaryService {
  constructor(
    private readonly fetchImpl: typeof fetch,
    private readonly endpoint = "/api/summaries"
  ) {}

  async getSummaryByRevisionId(input: SummaryApiRequest): Promise<ServiceResult<SummaryApiResponse>> {
    try {
      const query = new URLSearchParams({ revisionId: input.revisionId }).toString();
      const response = await this.fetchImpl(`${this.endpoint}?${query}`);
      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "NETWORK",
            message: "要約の取得に失敗しました。時間をおいて再試行してください。",
            retryable: true,
          },
        };
      }

      const payload = (await response.json()) as SummaryApiResponse;
      return {
        ok: true,
        data: payload,
      };
    } catch {
      return {
        ok: false,
        error: {
          code: "UNKNOWN",
          message: "要約取得中に予期しないエラーが発生しました。",
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
  fetchImpl: typeof fetch = fetch,
  endpoint?: string
): SummaryService {
  return new ApiSummaryService(fetchImpl, endpoint);
}
