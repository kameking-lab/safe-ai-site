/**
 * P1-4: 月次速報（厚労省・速報値）の要約抽出。
 * トレンドAI要約の「直近の公式速報」入力に使う。curatedサンプル依存で
 * 「直近1か月0件」になる問題を、実在の公式速報で補完する。
 *
 * 形式（事実）データのみ。集計列の上位抽出のみで、解釈や創作はしない。
 */
import monthlySokuhou from "@/data/accidents/monthly-sokuhou.json";

export type SokuhouTop = { name: string; total: number };

export type MonthlySokuhouSummary = {
  fetchedAt: string | null;
  sibouPeriod: string | null;
  sisyouPeriod: string | null;
  topSibou: SokuhouTop[];
  topSisyou: SokuhouTop[];
  sourceUrl: string;
};

type SokuhouSection = { period?: string; sourceUrl?: string; rows?: Array<{ name: string; total: number }> };

function topRows(section: SokuhouSection | undefined, limit: number): SokuhouTop[] {
  return (section?.rows ?? [])
    .filter((r) => typeof r.total === "number" && r.total > 0 && r.name)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((r) => ({ name: r.name, total: r.total }));
}

export function getMonthlySokuhouSummary(limit = 5): MonthlySokuhouSummary {
  const data = monthlySokuhou as {
    fetchedAt?: string;
    sibou?: SokuhouSection;
    sisyou?: SokuhouSection;
  };
  return {
    fetchedAt: data.fetchedAt ?? null,
    sibouPeriod: data.sibou?.period ?? null,
    sisyouPeriod: data.sisyou?.period ?? null,
    topSibou: topRows(data.sibou, limit),
    topSisyou: topRows(data.sisyou, limit),
    sourceUrl:
      data.sibou?.sourceUrl ||
      data.sisyou?.sourceUrl ||
      "https://anzeninfo.mhlw.go.jp/information/sokuhou.html",
  };
}
