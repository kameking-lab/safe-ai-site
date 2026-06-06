import type { CourtCase, CourtCaseField, CourtCaseIssue } from "@/data/court-cases";

/**
 * 労災/労働判例DB（数百件・検索可能）フェーズB: 検索基盤。
 *
 * 現状の CourtCasesBrowser はフィルタ処理をコンポーネント内にインラインで持っていたため、
 * 件数が数百件に増えてもスケールするよう、(1)検索ロジックを純関数に切り出し、
 * (2)既存フィールド（court文字列・date）から「裁判所種別」「年代」を導出してカテゴリ軸を増やし、
 * (3)カテゴリ別件数（ファセット）を算出する。**データの移行は不要**（既存23件のまま動く）。
 */

export type CourtType = "最高裁" | "高裁" | "地裁" | "その他";

/** 事件の裁判所名から裁判所種別を導出（最高裁＞高裁＞地裁の順に判定）。 */
export function courtTypeOf(court: string): CourtType {
  if (court.includes("最高裁")) return "最高裁";
  if (court.includes("高裁")) return "高裁";
  if (court.includes("地裁") || court.includes("地方裁判所")) return "地裁";
  return "その他";
}

/** ISO日付から年代ラベル（例: "1990年代"）を導出。 */
export function decadeOf(date: string): string {
  const year = Number(date.slice(0, 4));
  if (!Number.isFinite(year) || year < 1900) return "不明";
  return `${Math.floor(year / 10) * 10}年代`;
}

export type CourtCaseFilter = {
  issue?: CourtCaseIssue | "";
  field?: CourtCaseField | "";
  courtType?: CourtType | "";
  decade?: string;
  query?: string;
};

/** 自由ワード検索の対象テキスト（事件名・要旨・判断・裁判所）。 */
function haystack(c: CourtCase): string {
  return `${c.name} ${c.oneLine} ${c.summary} ${c.holding} ${c.court} ${c.practicePoints.join(" ")}`;
}

/** フィルタ適用（全条件 AND）。日付降順で返す。 */
export function filterCourtCases(cases: CourtCase[], f: CourtCaseFilter): CourtCase[] {
  const kw = (f.query ?? "").trim();
  return cases
    .filter((c) => {
      if (f.issue && !c.issues.includes(f.issue)) return false;
      if (f.field && c.field !== f.field) return false;
      if (f.courtType && courtTypeOf(c.court) !== f.courtType) return false;
      if (f.decade && decadeOf(c.date) !== f.decade) return false;
      if (kw && !haystack(c).includes(kw)) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export type CourtCaseFacets = {
  issues: { value: CourtCaseIssue; count: number }[];
  fields: { value: CourtCaseField; count: number }[];
  courtTypes: { value: CourtType; count: number }[];
  decades: { value: string; count: number }[];
};

/** カテゴリ別件数（ファセット）。件数の多い順。年代は新しい順。 */
export function computeFacets(cases: CourtCase[]): CourtCaseFacets {
  const issueMap = new Map<CourtCaseIssue, number>();
  const fieldMap = new Map<CourtCaseField, number>();
  const courtMap = new Map<CourtType, number>();
  const decadeMap = new Map<string, number>();
  for (const c of cases) {
    for (const i of c.issues) issueMap.set(i, (issueMap.get(i) ?? 0) + 1);
    fieldMap.set(c.field, (fieldMap.get(c.field) ?? 0) + 1);
    const ct = courtTypeOf(c.court);
    courtMap.set(ct, (courtMap.get(ct) ?? 0) + 1);
    const d = decadeOf(c.date);
    decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
  }
  const byCountDesc = <T>(m: Map<T, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  return {
    issues: byCountDesc(issueMap),
    fields: byCountDesc(fieldMap),
    courtTypes: byCountDesc(courtMap),
    decades: [...decadeMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, count]) => ({ value, count })),
  };
}
