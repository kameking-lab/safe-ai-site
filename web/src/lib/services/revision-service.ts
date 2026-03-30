import { lawRevisionCores } from "@/data/mock/law-revisions";
import type { RevisionListApiResponse, ServiceError, ServiceResult } from "@/lib/types/api";
import type { LawRevision } from "@/lib/types/domain";

export type RevisionService = {
  getCachedRevisions: () => LawRevision[];
  getInitialRevisionId: () => string | null;
  getLawRevisions: () => Promise<ServiceResult<LawRevision[]>>;
};

function toUnknownError(message: string): ServiceError {
  return {
    code: "UNKNOWN",
    message,
    retryable: true,
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
    async getLawRevisions() {
      try {
        const response = await fetchImpl(endpoint);
        if (!response.ok) {
          return {
            ok: false,
            error: {
              code: "NETWORK",
              message: "法改正一覧の取得に失敗しました。",
              retryable: true,
            },
          };
        }
        const payload = (await response.json()) as RevisionListApiResponse;
        return {
          ok: true,
          data: payload.revisions,
        };
      } catch {
        return {
          ok: false,
          error: toUnknownError("法改正一覧の取得中に予期しないエラーが発生しました。"),
        };
      }
    },
  };
}
