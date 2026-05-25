import { describe, it, expect } from "vitest";
import {
  normalizeWorker,
  normalizeWorkers,
  addWorker,
  updateWorker,
  removeWorker,
  setWorkerHidden,
  visibleWorkers,
  type Worker,
} from "./workers-master";

describe("normalizeWorker", () => {
  it("氏名なしは null", () => {
    expect(normalizeWorker({ name: "" })).toBeNull();
    expect(normalizeWorker(null)).toBeNull();
  });
  it("不正な所属は self にフォールバック", () => {
    const w = normalizeWorker({ name: "田中", affiliation: "xxx" });
    expect(w?.affiliation).toBe("self");
  });
  it("既定値を埋める", () => {
    const w = normalizeWorker({ name: " 佐藤 ", affiliation: "coop1", isRegular: true });
    expect(w?.name).toBe("佐藤");
    expect(w?.affiliation).toBe("coop1");
    expect(w?.isRegular).toBe(true);
    expect(w?.hidden).toBe(false);
  });
});

describe("normalizeWorkers", () => {
  it("配列でなければ空", () => {
    expect(normalizeWorkers("x")).toEqual([]);
  });
  it("壊れた要素は除外", () => {
    const out = normalizeWorkers([{ name: "A" }, { name: "" }, null, { name: "B" }]);
    expect(out.map((w) => w.name)).toEqual(["A", "B"]);
  });
});

describe("addWorker", () => {
  it("追加して一意IDを振る", () => {
    const list = addWorker([], { name: "山田", affiliation: "self" }, 1000);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("山田");
    expect(list[0].id).toContain("w_");
  });
  it("氏名空は無視", () => {
    expect(addWorker([], { name: "  " })).toEqual([]);
  });
});

describe("updateWorker / removeWorker / setWorkerHidden", () => {
  const base: Worker[] = [
    { id: "1", name: "A", affiliation: "self", company: "", qualNo: "", isRegular: false, hidden: false, createdAt: 1 },
    { id: "2", name: "B", affiliation: "coop1", company: "X社", qualNo: "", isRegular: false, hidden: false, createdAt: 2 },
  ];
  it("更新は対象のみ", () => {
    const out = updateWorker(base, "1", { qualNo: "10" });
    expect(out[0].qualNo).toBe("10");
    expect(out[1].qualNo).toBe("");
  });
  it("削除", () => {
    expect(removeWorker(base, "1").map((w) => w.id)).toEqual(["2"]);
  });
  it("非表示切替", () => {
    expect(setWorkerHidden(base, "2", true)[1].hidden).toBe(true);
  });
});

describe("visibleWorkers", () => {
  it("非表示を除外し常用→氏名順", () => {
    const list: Worker[] = [
      { id: "1", name: "佐藤", affiliation: "self", company: "", qualNo: "", isRegular: false, hidden: false, createdAt: 1 },
      { id: "2", name: "安倍", affiliation: "self", company: "", qualNo: "", isRegular: true, hidden: false, createdAt: 2 },
      { id: "3", name: "退職者", affiliation: "self", company: "", qualNo: "", isRegular: false, hidden: true, createdAt: 3 },
    ];
    const out = visibleWorkers(list);
    expect(out.map((w) => w.name)).toEqual(["安倍", "佐藤"]); // 常用が先頭、退職者は除外
  });
});
