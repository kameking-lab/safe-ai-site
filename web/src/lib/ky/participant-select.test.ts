import { describe, it, expect } from "vitest";
import {
  addParticipants,
  clearParticipants,
  groupWorkersByAffiliation,
} from "@/lib/ky/participant-select";
import type { KyInstructionParticipant } from "@/lib/types/operations";
import type { Worker, WorkerAffiliation } from "@/lib/ky/workers-master";

const mkWorker = (
  name: string,
  affiliation: WorkerAffiliation = "self",
  qualNo = "",
  isRegular = false,
): Worker => ({
  id: `w_${name}`,
  name,
  affiliation,
  company: "",
  qualNo,
  isRegular,
  hidden: false,
  createdAt: 0,
});

const p = (name = "", qualNo = ""): KyInstructionParticipant => ({ name, qualNo, preWork: "", onExit: "" });

describe("addParticipants", () => {
  it("空き行を優先して埋め、足りなければ末尾に追加する", () => {
    const base = [p("既存"), p(), p()];
    const out = addParticipants(base, [mkWorker("田中"), mkWorker("佐藤"), mkWorker("鈴木")]);
    expect(out.map((x) => x.name)).toEqual(["既存", "田中", "佐藤", "鈴木"]);
  });

  it("既に選択済みの氏名は重複追加しない", () => {
    const base = [p("田中")];
    const out = addParticipants(base, [mkWorker("田中"), mkWorker("佐藤")]);
    expect(out.filter((x) => x.name).map((x) => x.name)).toEqual(["田中", "佐藤"]);
  });

  it("資格Noを引き継ぐ", () => {
    const out = addParticipants([], [mkWorker("田中", "self", "1,10")]);
    expect(out[0]).toMatchObject({ name: "田中", qualNo: "1,10" });
  });

  it("追加対象が全て選択済みなら同一参照を返す（再レンダー抑止）", () => {
    const base = [p("田中")];
    const out = addParticipants(base, [mkWorker("田中")]);
    expect(out).toBe(base);
  });

  it("氏名が空白のみの作業員は無視する", () => {
    const out = addParticipants([], [mkWorker("   ")]);
    expect(out).toEqual([]);
  });
});

describe("clearParticipants", () => {
  it("指定氏名だけを空行化し手入力は温存する", () => {
    const base = [p("田中"), p("手入力さん"), p("佐藤")];
    const out = clearParticipants(base, ["田中", "佐藤"]);
    expect(out.map((x) => x.name)).toEqual(["", "手入力さん", ""]);
  });

  it("該当が無ければ同一参照を返す", () => {
    const base = [p("田中")];
    const out = clearParticipants(base, ["居ない人"]);
    expect(out).toBe(base);
  });
});

describe("groupWorkersByAffiliation", () => {
  it("自社→協力1→2→3順に並べ、空グループは除外する", () => {
    const ws = [
      mkWorker("協力A", "coop1"),
      mkWorker("自社A", "self"),
      mkWorker("協力C", "coop3"),
    ];
    const groups = groupWorkersByAffiliation(ws);
    expect(groups.map((g) => g.affiliation)).toEqual(["self", "coop1", "coop3"]);
    expect(groups[0].members.map((m) => m.name)).toEqual(["自社A"]);
    expect(groups[0].label).toBe("自社");
  });

  it("作業員が居なければ空配列", () => {
    expect(groupWorkersByAffiliation([])).toEqual([]);
  });
});
