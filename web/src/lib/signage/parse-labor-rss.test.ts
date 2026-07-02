import { describe, it, expect } from "vitest";
import {
  normalizeTitleForDedupe,
  parsePubDateMs,
  freshnessWeightedScore,
  selectLaborTrendItems,
  type LaborRssItem,
} from "./parse-labor-rss";

const NOW = new Date("2026-07-03T09:00:00+09:00").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toUTCString();

function item(over: Partial<LaborRssItem>): LaborRssItem {
  return { title: "工事現場で作業員が転落 - 産経ニュース", link: "https://example.com/a", pubDate: daysAgo(1), ...over };
}

describe("parsePubDateMs", () => {
  it("RFC822形式をパースできる", () => {
    expect(parsePubDateMs("Thu, 02 Jul 2026 10:00:00 GMT")).not.toBeNull();
  });

  it("空文字・不正値は null", () => {
    expect(parsePubDateMs("")).toBeNull();
    expect(parsePubDateMs("not a date")).toBeNull();
  });
});

describe("normalizeTitleForDedupe", () => {
  it("末尾の「 - 媒体名」を除去して同一視できる", () => {
    const a = normalizeTitleForDedupe("建設現場でクレーン転倒、死亡 - 産経ニュース");
    const b = normalizeTitleForDedupe("建設現場でクレーン転倒、死亡 - 毎日新聞");
    expect(a).toBe(b);
  });

  it("空白の有無・全半角ケースを吸収する", () => {
    const a = normalizeTitleForDedupe("重機 事故で 重傷 - A社");
    const b = normalizeTitleForDedupe("重機事故で重傷 - B社");
    expect(a).toBe(b);
  });

  it("本文が異なるタイトルは別物として扱う", () => {
    expect(normalizeTitleForDedupe("死亡事故A - X")).not.toBe(normalizeTitleForDedupe("死亡事故B - X"));
  });
});

describe("freshnessWeightedScore", () => {
  it("同じ重大度なら新しい記事の方がスコアが高い", () => {
    const fresh = freshnessWeightedScore("労働災害で死亡", daysAgo(0), NOW);
    const old = freshnessWeightedScore("労働災害で死亡", daysAgo(50), NOW);
    expect(fresh).toBeGreaterThan(old);
  });

  it("14日を超えると鮮度加点は0（重大度スコアのみ）", () => {
    const at14 = freshnessWeightedScore("死亡", daysAgo(14), NOW);
    const at60 = freshnessWeightedScore("死亡", daysAgo(60), NOW);
    expect(at14).toBeCloseTo(at60, 5);
  });

  it("日付不明でも重大度スコアだけは返す", () => {
    expect(freshnessWeightedScore("死亡事故", "", NOW)).toBeGreaterThan(0);
  });
});

describe("selectLaborTrendItems", () => {
  it("リンクが違っても正規化タイトルが一致すれば重複排除する", () => {
    const items = [
      item({ link: "https://a.example.com/1", title: "クレーン転倒、作業員死亡 - 産経ニュース" }),
      item({ link: "https://b.example.com/2", title: "クレーン転倒、作業員死亡 - 毎日新聞" }),
    ];
    const out = selectLaborTrendItems(items, 10, NOW);
    expect(out).toHaveLength(1);
  });

  it("14日以内の記事を優先し、鮮度加重スコア順に並ぶ", () => {
    const items = [
      item({ link: "https://x/1", title: "工事現場の転落", pubDate: daysAgo(50) }),
      item({ link: "https://x/2", title: "工事現場の転落B", pubDate: daysAgo(3) }),
      item({ link: "https://x/3", title: "工事現場の転落C", pubDate: daysAgo(10) }),
    ];
    const out = selectLaborTrendItems(items, 3, NOW);
    expect(out.map((i) => i.link)).toEqual(["https://x/2", "https://x/3", "https://x/1"]);
  });

  it("14日以内が不足する場合のみ古い記事で補完する", () => {
    const items = [
      item({ link: "https://x/1", title: "死亡事故が発生", pubDate: daysAgo(50) }),
      item({ link: "https://x/2", title: "軽微な事案", pubDate: daysAgo(3) }),
    ];
    const out = selectLaborTrendItems(items, 2, NOW);
    expect(out).toHaveLength(2);
    expect(out.map((i) => i.link)).toContain("https://x/1");
  });

  it("maxTotal件数で打ち切る", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      item({ link: `https://x/${i}`, title: `記事${i}死亡`, pubDate: daysAgo(i) })
    );
    expect(selectLaborTrendItems(items, 2, NOW)).toHaveLength(2);
  });
});
