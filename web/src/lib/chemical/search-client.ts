import type { MergedChemical } from "@/lib/mhlw-chemicals";

type ChemicalSearchResponse = {
  ok: boolean;
  items?: MergedChemical[];
};

type ChemicalSearchRuntimeCache = {
  pending: Map<string, Promise<MergedChemical[]>>;
  completed: Map<string, MergedChemical[]>;
  confirmedByCas: Map<string, MergedChemical>;
};

const moduleCache: ChemicalSearchRuntimeCache = {
  pending: new Map(),
  completed: new Map(),
  confirmedByCas: new Map(),
};
const CHEMICAL_RUNTIME_CACHE = "__safeAiChemicalSearchRuntimeCacheV1" as const;

function runtimeCache(): ChemicalSearchRuntimeCache {
  if (typeof window === "undefined") return moduleCache;
  const scope = window as Window &
    typeof globalThis & {
      __safeAiChemicalSearchRuntimeCacheV1?: ChemicalSearchRuntimeCache;
    };
  scope[CHEMICAL_RUNTIME_CACHE] ??= {
    pending: new Map(),
    completed: new Map(),
    confirmedByCas: new Map(),
  };
  return scope[CHEMICAL_RUNTIME_CACHE];
}

export class ChemicalCatalogUnavailableError extends Error {
  constructor(
    message = "化学物質データベースを現在検索できません",
    readonly reason: "http" | "invalid-response" | "network" = "network",
  ) {
    super(message);
    this.name = "ChemicalCatalogUnavailableError";
  }
}

export function searchChemicalCatalog(
  query: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<MergedChemical[]> {
  const normalized = query.trim();
  if (!normalized) return Promise.resolve([]);
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  const cache = runtimeCache();
  const confirmed = cache.confirmedByCas.get(normalized);
  if (confirmed) return Promise.resolve([confirmed]);
  const safeLimit = Math.min(30, Math.max(1, Math.trunc(limit)));
  const cacheKey = `${normalized}\u0000${safeLimit}`;
  const completed = cache.completed.get(cacheKey);
  if (completed) return Promise.resolve(completed);
  const existing = cache.pending.get(cacheKey);
  if (existing) return existing;

  const promise = fetch("/api/chemical/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: normalized, limit: safeLimit }),
    cache: "no-store",
    signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new ChemicalCatalogUnavailableError(
          `化学物質データベースの応答を確認できません（HTTP ${response.status}）`,
          "http",
        );
      }
      let data: ChemicalSearchResponse;
      try {
        data = (await response.json()) as ChemicalSearchResponse;
      } catch {
        throw new ChemicalCatalogUnavailableError(
          "化学物質データベースの応答形式を確認できません",
          "invalid-response",
        );
      }
      if (!data.ok || !Array.isArray(data.items)) {
        throw new ChemicalCatalogUnavailableError(
          "化学物質データベースの応答内容を確認できません",
          "invalid-response",
        );
      }
      cache.completed.set(cacheKey, data.items);
      return data.items;
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      if (error instanceof ChemicalCatalogUnavailableError) throw error;
      throw new ChemicalCatalogUnavailableError(
        "化学物質データベースへの通信を確認できません",
        "network",
      );
    });
  cache.pending.set(cacheKey, promise);
  void promise.then(
    () => {
      if (cache.pending.get(cacheKey) === promise) {
        cache.pending.delete(cacheKey);
      }
    },
    () => {
      if (cache.pending.get(cacheKey) === promise) {
        cache.pending.delete(cacheKey);
      }
    },
  );
  return promise;
}

export async function findChemicalByCas(
  cas: string,
  signal?: AbortSignal,
): Promise<MergedChemical | undefined> {
  const normalized = cas.normalize("NFKC").trim();
  if (!/^\d{2,7}-\d{2,3}-\d{1,2}$/.test(normalized)) return undefined;
  const confirmed = runtimeCache().confirmedByCas.get(normalized);
  if (confirmed) return confirmed;
  const exact = (await searchChemicalCatalog(normalized, 30, signal)).filter(
    (item) => item.cas === normalized,
  );
  return exact.length === 1 ? exact[0] : undefined;
}

/**
 * Re-resolve the selected identity on the server. A name-only or CAS-only
 * match is insufficient because isomers and mixtures can share a display
 * name while requiring different SDS records.
 */
export async function confirmChemicalCatalogSelection(
  cas: string,
  primaryName: string,
  originalQuery?: string,
  signal?: AbortSignal,
): Promise<MergedChemical> {
  const response = await fetch("/api/chemical/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      selection: {
        cas,
        primaryName,
        ...(originalQuery === undefined ? {} : { originalQuery }),
      },
    }),
    cache: "no-store",
    signal,
  });
  const data = (await response.json().catch(() => null)) as
    | { ok?: boolean; item?: MergedChemical | null }
    | null;
  if (!response.ok || data?.ok !== true || !data.item) {
    throw new ChemicalCatalogUnavailableError(
      response.status === 409
        ? "名称とCAS番号が一致しないか、一意に確定できません"
        : "化学物質の一意性確認を完了できません",
      response.ok ? "invalid-response" : "http",
    );
  }
  if (data.item.cas) {
    runtimeCache().confirmedByCas.set(data.item.cas, data.item);
  }
  return data.item;
}
