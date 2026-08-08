const MAX_CACHED_LEGAL_PROFILES = 32;

const legalProfileRequests = new Map<string, Promise<unknown>>();

function normalizeLegalProfileQuery(rawQuery: string): string {
  return rawQuery.normalize("NFKC").trim().slice(0, 120);
}

/**
 * 法令プロファイル取得を同一タブ内で共有する。
 *
 * 検索語は URL・storage・ログへ出さず、POST body とこの小さなメモリキャッシュ
 * だけで扱う。RA 結果の複数カードが同じ物質を描画しても通信は 1 回になる。
 */
export function fetchChemicalLegalProfile<T>(rawQuery: string): Promise<T> {
  const query = normalizeLegalProfileQuery(rawQuery);
  if (!query) {
    return Promise.reject(new Error("法令プロファイルの検索語が空です。"));
  }

  const cached = legalProfileRequests.get(query);
  if (cached) return cached as Promise<T>;

  const request = fetch("/api/chemical/legal-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: query }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("法令プロファイルを取得できませんでした。");
      }
      return response.json() as Promise<unknown>;
    })
    .catch((error: unknown) => {
      if (legalProfileRequests.get(query) === request) {
        legalProfileRequests.delete(query);
      }
      throw error;
    });

  legalProfileRequests.set(query, request);
  if (legalProfileRequests.size > MAX_CACHED_LEGAL_PROFILES) {
    const oldest = legalProfileRequests.keys().next().value;
    if (oldest && oldest !== query) legalProfileRequests.delete(oldest);
  }

  return request as Promise<T>;
}

export function clearChemicalLegalProfileRequestCache(): void {
  legalProfileRequests.clear();
}
