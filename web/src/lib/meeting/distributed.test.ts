import { describe, it, expect } from "vitest";
import {
  generateShareToken,
  isValidToken,
  sanitizeContribution,
  contributionToContractorRow,
  mergeContributionsIntoContractors,
  isHistoryExpired,
  activeHistory,
  pickPreviousPayload,
  hasWriteConflict,
  HISTORY_RETENTION_DAYS,
  type MeetingContribution,
  type MeetingContributionHistory,
} from "@/lib/meeting/distributed";
import type { MeetingContractorRow } from "@/lib/meeting/schema";

const contrib = (id: string, over: Partial<MeetingContribution["payload"]> = {}): MeetingContribution => ({
  contributionId: id,
  token: "a".repeat(64),
  submittedAt: "2026-06-01T00:00:00Z",
  payload: {
    companyName: "○○建設", type: "1次", workContent: "型枠", machines: "クレーン",
    qualifications: ["玉掛け"], plannedCount: "5", predictedDisasters: ["墜落"],
    risk: { severity: 2, likelihood: 2, priority: 3 }, safetyInstructions: "親綱使用", responsibleName: "山田",
    ...over,
  },
});

describe("共有トークン", () => {
  it("64桁16進・形式判定", () => {
    const t = generateShareToken();
    expect(isValidToken(t)).toBe(true);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });
  it("毎回ユニーク（衝突しない）", () => {
    const set = new Set(Array.from({ length: 200 }, () => generateShareToken()));
    expect(set.size).toBe(200);
  });
  it("不正値を拒否", () => {
    expect(isValidToken("")).toBe(false);
    expect(isValidToken("xyz")).toBe(false);
    expect(isValidToken("A".repeat(64))).toBe(false); // 大文字は不可
    expect(isValidToken(null)).toBe(false);
  });
});

describe("sanitizeContribution（許可フィールドのみ・混入防止）", () => {
  it("元請確定欄・当日欄・階層・id は受け付けない", () => {
    const out = sanitizeContribution({
      companyName: "A社", workContent: "解体",
      // 混入を試みる危険な値
      actualCount: "999", appendNote: "元請のメモを改ざん", parentId: "other-row", id: "victim-row",
      risk: { severity: 9, likelihood: -1, priority: 99 },
    });
    expect(out).not.toHaveProperty("actualCount");
    expect(out).not.toHaveProperty("appendNote");
    expect(out).not.toHaveProperty("parentId");
    expect(out).not.toHaveProperty("id");
    // risk は 1-3 / 1-4 にクランプ
    expect(out.risk.severity).toBe(3);
    expect(out.risk.likelihood).toBe(1);
    expect(out.risk.priority).toBe(4);
  });
  it("文字数上限・型強制", () => {
    const out = sanitizeContribution({ companyName: "x".repeat(500), type: "不正", qualifications: "notarray", predictedDisasters: [1, 2, "墜落"] });
    expect(out.companyName.length).toBe(100);
    expect(out.type).toBe("1次"); // 不正な type は既定
    expect(out.qualifications).toEqual([]);
    expect(out.predictedDisasters).toEqual(["墜落"]); // 非文字列は除去
  });
});

describe("mergeContributionsIntoContractors（集約・元請欄保護）", () => {
  it("新規投稿は行として追加される", () => {
    const out = mergeContributionsIntoContractors([], [contrib("c1"), contrib("c2")]);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe("contrib-c1");
  });

  it("再取り込みは同一行を更新（重複しない）＋元請の当日欄/追記欄/階層を保持", () => {
    const first = mergeContributionsIntoContractors([], [contrib("c1", { workContent: "旧" })]);
    // 元請が当日欄・追記欄・階層を記入
    first[0].actualCount = "4";
    first[0].appendNote = "元請確認済";
    first[0].parentId = "moto-uke-row";
    // 協力会社が内容を更新して再投稿
    const second = mergeContributionsIntoContractors(first, [contrib("c1", { workContent: "新（更新後）" })]);
    expect(second).toHaveLength(1); // 重複しない
    expect(second[0].workContent).toBe("新（更新後）"); // 協力会社の申告は反映
    expect(second[0].actualCount).toBe("4"); // 元請の当日欄は保持
    expect(second[0].appendNote).toBe("元請確認済"); // 元請の追記は保持
    expect(second[0].parentId).toBe("moto-uke-row"); // 階層は保持
  });

  it("元請が手で作った行（contrib-接頭辞でない）は一切触らない", () => {
    const manual: MeetingContractorRow = {
      id: "manual-1", type: "元請", parentId: null, companyName: "元請社", workContent: "統括",
      machines: "", qualifications: [], plannedCount: "", predictedDisasters: [],
      risk: { severity: 1, likelihood: 1, priority: 1 }, safetyInstructions: "", responsibleName: "所長",
      actualCount: "", appendNote: "",
    };
    const out = mergeContributionsIntoContractors([manual], [contrib("c1")]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.id === "manual-1")).toEqual(manual); // 不変
  });

  it("contributionToContractorRow は当日欄を空で初期化（協力会社は当日欄を持ち込めない）", () => {
    const row = contributionToContractorRow(contrib("c1"));
    expect(row.actualCount).toBe("");
    expect(row.appendNote).toBe("");
    expect(row.id).toBe("contrib-c1");
  });
});

describe("要件1: 同時入力でデータ消失しない（行レベル分離）", () => {
  it("2社が同時に入力しても別々の行になり双方残る（後勝ちで消えない）", () => {
    // 2社の投稿は contribution_id が異なる＝別行。順不同で取り込んでも両方残る。
    const a = contrib("companyA");
    const b = contrib("companyB", { companyName: "B社" });
    const out1 = mergeContributionsIntoContractors([], [a, b]);
    const out2 = mergeContributionsIntoContractors([], [b, a]);
    expect(out1.map((r) => r.id).sort()).toEqual(["contrib-companyA", "contrib-companyB"]);
    expect(out2.map((r) => r.id).sort()).toEqual(["contrib-companyA", "contrib-companyB"]);
    expect(out1).toHaveLength(2);
  });

  it("同一社の複数回更新は単一行のまま（重複せず最新を反映）", () => {
    const first = mergeContributionsIntoContractors([], [contrib("cX", { workContent: "v1" })]);
    const again = mergeContributionsIntoContractors(first, [contrib("cX", { workContent: "v2" })]);
    expect(again).toHaveLength(1);
    expect(again[0].workContent).toBe("v2");
  });

  it("楽観ロック: 同一行(同一cid)の並行更新を検知（base≠current=競合）", () => {
    expect(hasWriteConflict("2026-06-02T00:00:10Z", "2026-06-02T00:00:00Z")).toBe(true); // 他で更新済み
    expect(hasWriteConflict("2026-06-02T00:00:00Z", "2026-06-02T00:00:00Z")).toBe(false); // 一致＝OK
    expect(hasWriteConflict("2026-06-02T00:00:00Z", null)).toBe(false); // 新規/非対象
    expect(hasWriteConflict(null, "2026-06-02T00:00:00Z")).toBe(false); // 現在行なし
  });
});

describe("要件2: 入力履歴・期限切れ除外・一つ前に戻す", () => {
  const H = (id: string, recordedAt: string, workContent: string): MeetingContributionHistory => ({
    historyId: id, contributionId: "cX", token: "t".repeat(64), recordedAt,
    payload: { ...contrib("cX").payload, workContent },
  });
  const now = new Date("2026-06-02T00:00:00Z").getTime();

  it("保持期間(30日)超過は期限切れ判定", () => {
    expect(HISTORY_RETENTION_DAYS).toBe(30);
    expect(isHistoryExpired("2026-04-01T00:00:00Z", now)).toBe(true); // 60日以上前
    expect(isHistoryExpired("2026-05-20T00:00:00Z", now)).toBe(false); // 13日前
    expect(isHistoryExpired("not-a-date", now)).toBe(false); // 不正日付は消さない（安全側）
  });

  it("activeHistory: 期限切れを除外し新しい順", () => {
    const hist = [H("h1", "2026-05-30T00:00:00Z", "新"), H("h0", "2026-03-01T00:00:00Z", "古(期限切れ)"), H("h2", "2026-05-31T00:00:00Z", "最新")];
    const act = activeHistory(hist, now);
    expect(act.map((h) => h.historyId)).toEqual(["h2", "h1"]); // h0は除外、新しい順
  });

  it("pickPreviousPayload: 現在より前の最新スナップショットを返す（一つ前に戻す）", () => {
    const hist = [H("h1", "2026-05-30T00:00:00Z", "v1"), H("h2", "2026-05-31T00:00:00Z", "v2"), H("h3", "2026-06-01T00:00:00Z", "v3(現在)")];
    const prev = pickPreviousPayload(hist, "2026-06-01T00:00:00Z", now);
    expect(prev?.workContent).toBe("v2"); // 現在(v3)の一つ前=v2
  });

  it("pickPreviousPayload: 戻す先が無ければ null", () => {
    const hist = [H("h1", "2026-05-31T00:00:00Z", "only")];
    expect(pickPreviousPayload(hist, "2026-05-31T00:00:00Z", now)).toBeNull();
  });
});
