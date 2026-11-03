export type PublicContentRevalidationEvidence = {
  kind: "primary-source" | "automated-check";
  locator: string;
  supports: string;
};

export type PublicContentRevalidationRecord = {
  path: string;
  decision: "approved-for-publication";
  reviewedAt: string;
  scope: string;
  limitations: readonly string[];
  evidence: readonly PublicContentRevalidationEvidence[];
};

/**
 * Routes in this list fail closed in public-content-policy until a complete,
 * approved record exists below. A route must not be removed from quarantine by
 * changing only the denylist.
 */
export const PUBLIC_REVALIDATION_REQUIRED_PATHS = [
  "/accidents-analytics",
] as const;

type RevalidationRequiredPath =
  (typeof PUBLIC_REVALIDATION_REQUIRED_PATHS)[number];

export const PUBLIC_CONTENT_REVALIDATION_RECORDS: Partial<
  Record<RevalidationRequiredPath, PublicContentRevalidationRecord>
> = {
  "/accidents-analytics": {
    path: "/accidents-analytics",
    decision: "approved-for-publication",
    reviewedAt: "2026-09-20",
    scope:
      "既定表示を厚労省死亡災害個票に限定し、全国速報と収録個票を分離し、割合を項目値既知件数で算出する境界を再検証。",
    limitations: [
      "収録個票の件数・構成比であり、労働者数や延べ労働時間を分母にした発生率ではない。",
      "欠損値は各分析軸の割合の母数から除外し、項目ごとの既知件数を表示する。",
      "全国速報と死亡災害個票は対象期間・報告締切・集計単位が異なるため合算しない。",
    ],
    evidence: [
      {
        kind: "primary-source",
        locator: "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.html",
        supports:
          "死亡災害個票の公開範囲と、年・月・時間・業種・起因物・事故型などの収録項目。",
      },
      {
        kind: "primary-source",
        locator:
          "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei11/rousai-hassei/",
        supports: "全国速報の公表月、速報・確定の区別、公式配布資料。",
      },
      {
        kind: "automated-check",
        locator: "src/lib/accidents-analytics/filters.test.ts",
        supports:
          "既定データ源が公式死亡災害個票で、編集事例を混在させないこと。",
      },
      {
        kind: "automated-check",
        locator: "src/lib/accidents-analytics/insights.test.ts",
        supports:
          "構成比が分析軸ごとの既知件数を母数にし、発生率と表現しないこと。",
      },
    ],
  },
};

const requiredPaths = new Set<string>(PUBLIC_REVALIDATION_REQUIRED_PATHS);

export function requiresPublicContentRevalidation(path: string): boolean {
  return requiredPaths.has(path);
}

export function hasApprovedPublicContentRevalidation(path: string): boolean {
  const record =
    PUBLIC_CONTENT_REVALIDATION_RECORDS[path as RevalidationRequiredPath];
  if (!record || record.path !== path) return false;
  if (record.decision !== "approved-for-publication") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(record.reviewedAt)) return false;
  if (record.limitations.length === 0) return false;
  return (
    record.evidence.some(
      (item) =>
        item.kind === "primary-source" &&
        /^https:\/\/(?:www\.)?(?:mhlw\.go\.jp|anzeninfo\.mhlw\.go\.jp)\//u.test(
          item.locator,
        ),
    ) && record.evidence.some((item) => item.kind === "automated-check")
  );
}
