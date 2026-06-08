import { describe, it, expect } from "vitest";
import {
  summarizeWorkerQual,
  qualRosterToCsv,
  groupByQualification,
  filterQualGroups,
  PRESET_QUALIFICATIONS,
  type WorkerQual,
} from "./qualification-store";

function w(over: Partial<WorkerQual> = {}): WorkerQual {
  return {
    id: "w1",
    workerName: "作業 太郎",
    company: "△△工業",
    trade: "とび工",
    quals: [
      { id: "q1", name: "玉掛け 技能講習", date: "2020-05-01" },
      { id: "q2", name: "フルハーネス型墜落制止用器具 特別教育", date: "2022-06-10" },
    ],
    note: "",
    savedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

describe("PRESET_QUALIFICATIONS", () => {
  it("主要な特別教育・技能講習を含む", () => {
    expect(PRESET_QUALIFICATIONS.length).toBeGreaterThanOrEqual(10);
    expect(PRESET_QUALIFICATIONS.some((q) => q.includes("フルハーネス"))).toBe(true);
    expect(PRESET_QUALIFICATIONS.some((q) => q.includes("玉掛け"))).toBe(true);
  });
});

describe("summarizeWorkerQual", () => {
  it("保有資格数を集計", () => {
    expect(summarizeWorkerQual(w()).qualCount).toBe(2);
  });
});

describe("qualRosterToCsv", () => {
  it("1行=作業者×資格、和名ヘッダー", () => {
    const csv = qualRosterToCsv([w(), w({ id: "w2", workerName: "作業 次郎", quals: [] })]);
    const lines = csv.split("\r\n");
    // header + 2(太郎の資格2) + 1(次郎は資格0で1行)
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("取得・修了日");
    expect(lines[1]).toContain("玉掛け 技能講習");
    expect(lines[3]).toContain("作業 次郎");
  });
});

describe("groupByQualification", () => {
  function mk(id: string, workerName: string, quals: string[]): WorkerQual {
    return {
      id,
      workerName,
      company: `${id}社`,
      trade: "とび工",
      quals: quals.map((name, i) => ({ id: `${id}-q${i}`, name, date: "2025-04-01" })),
      note: "",
      savedAt: "2026-07-01T00:00:00.000Z",
    };
  }

  it("資格名でグルーピングし、保有者を集約する", () => {
    const groups = groupByQualification([
      mk("a", "Aさん", ["玉掛け 技能講習", "フォークリフト運転 技能講習"]),
      mk("b", "Bさん", ["玉掛け 技能講習"]),
      mk("c", "Cさん", ["アーク溶接 特別教育"]),
    ]);
    const tamakake = groups.find((g) => g.name === "玉掛け 技能講習");
    expect(tamakake?.holders.map((h) => h.workerName).sort()).toEqual(["Aさん", "Bさん"]);
    const fork = groups.find((g) => g.name === "フォークリフト運転 技能講習");
    expect(fork?.holders).toHaveLength(1);
    expect(fork?.holders[0]?.workerId).toBe("a");
  });

  it("保有者数の多い順に並ぶ", () => {
    const groups = groupByQualification([
      mk("a", "Aさん", ["玉掛け 技能講習", "アーク溶接 特別教育"]),
      mk("b", "Bさん", ["玉掛け 技能講習"]),
      mk("c", "Cさん", ["玉掛け 技能講習"]),
    ]);
    expect(groups[0]?.name).toBe("玉掛け 技能講習");
    expect(groups[0]?.holders).toHaveLength(3);
  });

  it("氏名が空の作業者は名簿に出さない", () => {
    const groups = groupByQualification([mk("a", "  ", ["玉掛け 技能講習"])]);
    expect(groups).toHaveLength(0);
  });

  it("同一作業者の同名資格は1人として数える", () => {
    const groups = groupByQualification([mk("a", "Aさん", ["玉掛け 技能講習", "玉掛け 技能講習"])]);
    expect(groups[0]?.holders).toHaveLength(1);
  });

  it("空・空白の資格名は除外する", () => {
    const groups = groupByQualification([mk("a", "Aさん", ["玉掛け 技能講習", "  ", ""])]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("玉掛け 技能講習");
  });
});

describe("filterQualGroups", () => {
  const groups = [
    { name: "玉掛け 技能講習", holders: [] },
    { name: "フォークリフト運転 技能講習", holders: [] },
    { name: "アーク溶接 特別教育", holders: [] },
  ];

  it("空クエリは全件を返す", () => {
    expect(filterQualGroups(groups, "  ")).toHaveLength(3);
  });

  it("資格名の部分一致で絞り込む", () => {
    expect(filterQualGroups(groups, "玉掛け").map((g) => g.name)).toEqual(["玉掛け 技能講習"]);
    expect(filterQualGroups(groups, "技能講習")).toHaveLength(2);
  });
});
