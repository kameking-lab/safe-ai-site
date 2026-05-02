import type { SafetyDiaryEntry } from "./schema";

export type MonthlySummary = {
  yearMonth: string;
  totalEntries: number;
  /** 延労働人数 */
  totalPeople: number;
  /** 平均人数/日 */
  avgPeoplePerDay: number;
  /** KY実施率（KY結果が入力されているエントリ÷全エントリ） */
  kyImplementationRate: number;
  /** ヒヤリハット件数 */
  nearMissCount: number;
  /** 関連法改正の件数（重複除去） */
  relatedLawCount: number;
  /** 類似事故事例の件数（重複除去） */
  similarAccidentCount: number;
  /** AIサマリー（テンプレ生成） */
  aiSummary: string;
  /** 日次の延べ人数推移 */
  trendByDate: { date: string; people: number; nearMiss: boolean }[];
};

export function computeMonthlySummary(
  entries: SafetyDiaryEntry[],
  yearMonth: string
): MonthlySummary {
  const totalEntries = entries.length;
  const totalPeople = entries.reduce(
    (sum, e) => sum + (e.optional.plannedPeopleCount ?? 0),
    0
  );
  const avgPeoplePerDay = totalEntries > 0 ? totalPeople / totalEntries : 0;
  const kyImplemented = entries.filter((e) => e.required.kyResult.trim().length > 0).length;
  const kyImplementationRate = totalEntries > 0 ? kyImplemented / totalEntries : 0;
  const nearMissCount = entries.filter((e) => e.required.nearMissOccurred).length;

  const lawIds = new Set<string>();
  const accidentIds = new Set<string>();
  for (const e of entries) {
    e.relatedLawRevisionIds.forEach((id) => lawIds.add(id));
    e.similarAccidentIds.forEach((id) => accidentIds.add(id));
  }

  const trendByDate = entries
    .slice()
    .sort((a, b) => a.required.date.localeCompare(b.required.date))
    .map((e) => ({
      date: e.required.date,
      people: e.optional.plannedPeopleCount ?? 0,
      nearMiss: e.required.nearMissOccurred,
    }));

  // AIサマリーは現状はテンプレ生成（将来 Gemini で置換）
  const aiSummary = makeTemplateSummary({
    totalEntries,
    totalPeople,
    nearMissCount,
    kyImplementationRate,
    yearMonth,
  });

  return {
    yearMonth,
    totalEntries,
    totalPeople,
    avgPeoplePerDay,
    kyImplementationRate,
    nearMissCount,
    relatedLawCount: lawIds.size,
    similarAccidentCount: accidentIds.size,
    aiSummary,
    trendByDate,
  };
}

function makeTemplateSummary(input: {
  totalEntries: number;
  totalPeople: number;
  nearMissCount: number;
  kyImplementationRate: number;
  yearMonth: string;
}): string {
  if (input.totalEntries === 0) {
    return `${input.yearMonth} の記録はまだありません。日誌を記録すると月次トレンドがここに表示されます。`;
  }
  const kyPct = Math.round(input.kyImplementationRate * 100);
  const lines = [
    `${input.yearMonth} は ${input.totalEntries} 日分の記録があり、延労働人数は ${input.totalPeople.toLocaleString()} 人でした。`,
    `KY実施率は ${kyPct}% で、ヒヤリハットは ${input.nearMissCount} 件報告されました。`,
  ];
  if (input.nearMissCount > 0) {
    lines.push(
      `ヒヤリハットは早期に共有し、類似事故事例（/accidents）と関連法改正（/laws）を朝礼で確認しましょう。`
    );
  }
  if (kyPct < 80) {
    lines.push(`KY実施率が80%未満です。/ky から作成し、日誌に転記する運用を徹底してください。`);
  }
  return lines.join("\n");
}
