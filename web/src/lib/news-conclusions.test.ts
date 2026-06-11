import { describe, expect, it } from "vitest";
import {
  computeWhatsNewConclusion,
  computeLawsConclusion,
  countNewDates,
  ENFORCEMENT_SOON_DAYS,
} from "./news-conclusions";
import type { NewsHubItem } from "./news-hub-types";

// 判定基準日を固定（テストの再現性）
const NOW = new Date(2026, 5, 11); // 2026-06-11

function item(over: Partial<NewsHubItem>): NewsHubItem {
  return {
    id: "t1",
    category: "notice",
    title: "テスト項目",
    summary: "",
    date: "2026-06-01",
    url: "https://example.com",
    ...over,
  };
}

describe("computeWhatsNewConclusion: 色文法（黄=施行間近 > 青=新着 > 緑=なし）", () => {
  it("60日以内に施行される法改正があれば黄=施行間近（件数と最短を出す）", () => {
    const items = [
      item({ id: "a", category: "law-revision", title: "改正A", enforcementDaysLeft: 45 }),
      item({ id: "b", category: "law-revision", title: "改正B", enforcementDaysLeft: 10 }),
      item({ id: "c", category: "law-revision", title: "改正C", enforcementDaysLeft: 200 }),
      item({ id: "d", date: "2026-06-10" }),
    ];
    const c = computeWhatsNewConclusion(items, "2026-06-01", NOW);
    expect(c.tone).toBe("warning");
    expect(c.value).toBe(2);
    expect(c.title).toBe("施行間近");
    expect(c.nearest).toEqual({ title: "改正B", daysLeft: 10 });
    expect(c.description).toContain("改正B");
    expect(c.description).toContain("あと10日");
  });

  it("施行間近なし＋前回閲覧以降の新着ありなら青=新着あり", () => {
    const items = [
      item({ id: "a", date: "2026-06-10" }),
      item({ id: "b", date: "2026-06-09" }),
      item({ id: "c", date: "2026-05-01" }),
    ];
    const c = computeWhatsNewConclusion(items, "2026-06-05", NOW);
    expect(c.tone).toBe("info");
    expect(c.value).toBe(2);
    expect(c.title).toBe("新着あり");
  });

  it("初訪問（lastVisit無し）は直近30日を新着として青", () => {
    const items = [item({ id: "a", date: "2026-06-01" }), item({ id: "b", date: "2026-01-01" })];
    const c = computeWhatsNewConclusion(items, null, NOW);
    expect(c.tone).toBe("info");
    expect(c.value).toBe(1);
  });

  it("新着ゼロなら緑=新着なし（赤は決して使わない）", () => {
    const items = [item({ id: "a", date: "2026-06-01" })];
    const c = computeWhatsNewConclusion(items, "2026-06-10", NOW);
    expect(c.tone).toBe("safe");
    expect(c.value).toBe(0);
    expect(c.title).toBe("新着なし");
  });

  it("施行済み（enforcementDaysLeft=null）の法改正は施行間近に数えない", () => {
    const items = [
      item({ id: "a", category: "law-revision", title: "施行済", enforcementDaysLeft: null, date: "2026-01-01" }),
    ];
    const c = computeWhatsNewConclusion(items, "2026-06-10", NOW);
    expect(c.tone).toBe("safe");
  });
});

describe("computeLawsConclusion: /laws と /whats-new で同じ基準（60日）", () => {
  it("60日以内の施行があれば黄=施行間近", () => {
    const c = computeLawsConclusion(
      [
        { title: "改正X", enforcement_date: "2026-07-01" }, // あと20日
        { title: "改正Y", enforcement_date: "2026-12-01" }, // 60日超
        { title: "改正Z", enforcement_date: "2025-01-01" }, // 施行済
      ],
      NOW,
    );
    expect(c.tone).toBe("warning");
    expect(c.value).toBe(1);
    expect(c.title).toBe("施行間近");
    expect(c.nearest?.title).toBe("改正X");
    expect(c.nearest?.daysLeft).toBe(20);
  });

  it("施行前はあるが60日超なら青=施行待ち", () => {
    const c = computeLawsConclusion([{ title: "改正Y", enforcement_date: "2026-12-01" }], NOW);
    expect(c.tone).toBe("info");
    expect(c.title).toBe("施行待ち");
    expect(c.value).toBe(1);
  });

  it("施行前ゼロなら緑", () => {
    const c = computeLawsConclusion([{ title: "改正Z", enforcement_date: "2025-01-01" }], NOW);
    expect(c.tone).toBe("safe");
    expect(c.title).toBe("施行間近なし");
  });

  it("e-Gov公式ステータス（enforcement_status）を日付より優先する", () => {
    // 公式が upcoming と言うなら日付が無くても施行待ち（推測しない）
    const c = computeLawsConclusion([{ title: "改正W", enforcement_status: "upcoming" }], NOW);
    expect(c.tone).toBe("info");
  });

  it("境界: ちょうど60日後は施行間近に含む", () => {
    const c = computeLawsConclusion([{ title: "境界", enforcement_date: "2026-08-10" }], NOW);
    expect(c.nearest?.daysLeft).toBe(ENFORCEMENT_SOON_DAYS);
    expect(c.tone).toBe("warning");
  });
});

describe("countNewDates: トップページ新着タイルのバッジ件数（/whats-new と同一基準）", () => {
  it("lastVisit 以降の日付だけ数える", () => {
    expect(countNewDates(["2026-06-10", "2026-06-05", "2026-06-01"], "2026-06-05", NOW)).toBe(1);
  });
  it("lastVisit 無しは直近30日", () => {
    expect(countNewDates(["2026-06-10", "2026-04-01"], null, NOW)).toBe(1);
  });
  it("当日訪問済みなら0（whats-new 閲覧後にトップへ戻るとバッジが消える）", () => {
    expect(countNewDates(["2026-06-11", "2026-06-10"], "2026-06-11", NOW)).toBe(0);
  });
  it("未来日（施行日が将来の法改正）は新着に数えない＝バッジが永遠に残らない", () => {
    expect(countNewDates(["2026-12-01", "2027-04-01"], "2026-06-11", NOW)).toBe(0);
  });
});

describe("computeWhatsNewConclusion: 未来日は「新着」に数えない（is-new恒久点灯バグの回帰）", () => {
  it("施行日が将来（60日超）の法改正だけなら緑=新着なし", () => {
    const items = [
      item({ id: "a", category: "law-revision", title: "来年施行", date: "2027-04-01", enforcementDaysLeft: 294 }),
    ];
    const c = computeWhatsNewConclusion(items, "2026-06-11", NOW);
    expect(c.tone).toBe("safe");
    expect(c.value).toBe(0);
  });
});
