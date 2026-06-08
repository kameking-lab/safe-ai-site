import { describe, it, expect } from "vitest";
import {
  defaultInductionItems,
  summarizeInduction,
  rosterToCsv,
  monthOf,
  distinctSites,
  distinctMonths,
  buildRoster,
  rosterFileName,
  DEFAULT_INDUCTION_ITEMS,
  type InductionRecord,
} from "./induction-store";

function makeRecord(over: Partial<InductionRecord> = {}): InductionRecord {
  const items = defaultInductionItems();
  items[0]!.checked = true;
  items[1]!.checked = true;
  return {
    id: "ind-1",
    date: "2026-07-10",
    siteName: "○○新築工事",
    workerName: "新人 太郎",
    company: "△△工業",
    trade: "鉄筋工",
    educator: "職長 山田",
    items,
    note: "経験3年",
    confirmedWorker: true,
    confirmedEducator: true,
    savedAt: "2026-07-10T00:00:00.000Z",
    ...over,
  };
}

describe("defaultInductionItems", () => {
  it("安衛則35条8項目＋建設受入項目を含み、初期は全て未チェック", () => {
    const items = defaultInductionItems();
    expect(items.length).toBe(DEFAULT_INDUCTION_ITEMS.length);
    expect(items.length).toBeGreaterThanOrEqual(8);
    expect(items.every((i) => i.checked === false)).toBe(true);
    expect(items.find((i) => i.key === "procedure")?.label).toContain("作業手順");
  });
});

describe("summarizeInduction", () => {
  it("実施項目数と総数を集計", () => {
    const s = summarizeInduction(makeRecord());
    expect(s.total).toBe(DEFAULT_INDUCTION_ITEMS.length);
    expect(s.doneCount).toBe(2);
    expect(s.workerName).toBe("新人 太郎");
  });
});

describe("rosterToCsv", () => {
  it("ヘッダー＋1名1行、確認は○、実施/全の形式", () => {
    const csv = rosterToCsv([makeRecord(), makeRecord({ id: "ind-2", workerName: "新人 花子", confirmedEducator: false })]);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // header + 2
    expect(lines[0]).toContain("教育項目(実施/全)");
    expect(lines[1]).toContain("新人 太郎");
    expect(lines[1]).toContain(`2/${DEFAULT_INDUCTION_ITEMS.length}`);
    expect(lines[1]).toContain("○"); // 本人確認○
  });

  it("カンマを含む備考はクォートされる", () => {
    const csv = rosterToCsv([makeRecord({ note: "玉掛け, フルハーネス済" })]);
    expect(csv).toContain('"玉掛け, フルハーネス済"');
  });
});

describe("monthOf", () => {
  it("YYYY-MM-DD から YYYY-MM を取り出す", () => {
    expect(monthOf("2026-06-15")).toBe("2026-06");
    expect(monthOf("")).toBe("");
    expect(monthOf("不正")).toBe("");
  });
});

// 本社月次提出：複数現場・複数月が混在した実データ
const A1 = makeRecord({ id: "a1", date: "2026-05-08", siteName: "A棟", workerName: "佐藤", company: "山田工業" });
const A2 = makeRecord({ id: "a2", date: "2026-05-09", siteName: "A棟", workerName: "鈴木", company: "海山建設" });
const A3 = makeRecord({ id: "a3", date: "2026-06-02", siteName: "A棟", workerName: "田中", company: "川下電気" });
const B1 = makeRecord({ id: "b1", date: "2026-05-20", siteName: "B橋梁", workerName: "高橋", company: "海山建設" });
const C1 = makeRecord({ id: "c1", date: "2026-04-28", siteName: "C造成", workerName: "渡辺", company: "大地土木" });
const MIXED = [A3, B1, A1, C1, A2]; // バラバラの順

describe("distinctSites / distinctMonths", () => {
  it("現場名を重複なく返す", () => {
    expect(distinctSites(MIXED)).toEqual(["A棟", "B橋梁", "C造成"]);
  });
  it("月を重複なく新しい順に返す", () => {
    expect(distinctMonths(MIXED)).toEqual(["2026-06", "2026-05", "2026-04"]);
  });
  it("空の現場名は無視する", () => {
    expect(distinctSites([makeRecord({ siteName: "  " }), A1])).toEqual(["A棟"]);
  });
});

describe("buildRoster", () => {
  it("現場で絞り込む", () => {
    const r = buildRoster(MIXED, { site: "A棟" });
    expect(r.map((x) => x.id)).toEqual(["a1", "a2", "a3"]); // 実施日昇順
  });
  it("月で絞り込む", () => {
    const r = buildRoster(MIXED, { month: "2026-05" });
    expect(r.every((x) => x.date.startsWith("2026-05"))).toBe(true);
    expect(r).toHaveLength(3);
  });
  it("現場×月の複合で絞り込む", () => {
    const r = buildRoster(MIXED, { site: "A棟", month: "2026-05" });
    expect(r.map((x) => x.id)).toEqual(["a1", "a2"]);
  });
  it("未指定なら全件を現場→実施日昇順で並べる", () => {
    const r = buildRoster(MIXED);
    expect(r.map((x) => x.siteName)).toEqual(["A棟", "A棟", "A棟", "B橋梁", "C造成"]);
    // A棟内は実施日昇順（5/8, 5/8, 6/2）
    expect(r.filter((x) => x.siteName === "A棟").map((x) => x.date)).toEqual(["2026-05-08", "2026-05-09", "2026-06-02"]);
  });
  it("該当0件なら空配列", () => {
    expect(buildRoster(MIXED, { site: "存在しない現場" })).toEqual([]);
  });
});

describe("rosterFileName", () => {
  it("現場・月を反映し、複数DLでも区別できる", () => {
    expect(rosterFileName({ month: "2026-05", site: "A棟" })).toBe("induction-roster-2026-05-A棟.csv");
    expect(rosterFileName({ month: "2026-05" })).toBe("induction-roster-2026-05.csv");
    expect(rosterFileName({ site: "A棟" })).toBe("induction-roster-A棟.csv");
    expect(rosterFileName()).toBe("induction-roster-all.csv");
  });
  it("ファイル名に使えない記号は除去する", () => {
    expect(rosterFileName({ site: "A/B:棟*?" })).toBe("induction-roster-AB棟.csv");
  });
});
