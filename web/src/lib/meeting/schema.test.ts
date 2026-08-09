import { describe, expect, it } from "vitest";
import {
  buildDefaultMeetingRecord,
  buildDefaultMeetingRecordFromSeed,
  createDefaultMeetingRecordSeed,
  normalizeMeetingRecord,
  computePriority,
  aggregateMachines,
  emptyContractorRow,
  buildDefaultChecklist,
} from "@/lib/meeting/schema";

describe("meeting schema", () => {
  it("指定したID生成器と時刻でhydration-safeな初期レコードを再現できる", () => {
    const build = () => {
      let sequence = 0;
      return buildDefaultMeetingRecord({
        idFactory: () => `stable-${sequence++}`,
        now: new Date("2026-07-22T00:00:00.000Z"),
      });
    };
    expect(build()).toEqual(build());
    expect(build().contractors[0]?.id).toBe("stable-0");
  });

  it("最小シードから日時・IDを含む既定レコードを損失なく復元する", () => {
    const now = new Date("2026-07-22T15:30:00.000Z");
    const buildExpected = () => {
      let sequence = 0;
      return buildDefaultMeetingRecord({
        idFactory: () => `seed-${sequence++}`,
        now,
      });
    };
    let seedSequence = 0;
    const seed = createDefaultMeetingRecordSeed({
      idFactory: () => `seed-${seedSequence++}`,
      now,
    });
    const record = buildDefaultMeetingRecordFromSeed(seed);

    expect(record).toEqual(buildExpected());
    expect(record.contractors[0]?.id).toBe("seed-0");
    expect(record.id).toBe("seed-1");
    expect(record.deliveries[0]?.id).toBe("seed-2");
    expect([
      record.workDateYear,
      record.workDateMonth,
      record.workDateDay,
    ]).toEqual(seed.workDate);
    expect(record.meetingDate).toBe(seed.meetingDate);
    expect(record.savedAt).toBe(seed.savedAt);
    expect(record.checklist).toEqual(buildDefaultChecklist());
  });

  it("computePriority: 重大性×可能性 を 1-4 に写像", () => {
    expect(computePriority(1, 1)).toBe(1); // 1
    expect(computePriority(3, 1)).toBe(2); // 3
    expect(computePriority(2, 2)).toBe(2); // 4
    expect(computePriority(3, 2)).toBe(3); // 6
    expect(computePriority(3, 3)).toBe(4); // 9
  });

  it("aggregateMachines: 業者の使用機械を集計", () => {
    const rows = [
      { ...emptyContractorRow(), machines: "バックホウ、ダンプ" },
      { ...emptyContractorRow(), machines: "バックホウ" },
    ];
    const agg = aggregateMachines(rows);
    const backhoe = agg.find((m) => m.name === "バックホウ");
    expect(backhoe?.count).toBe(2);
    expect(agg.find((m) => m.name === "ダンプ")?.count).toBe(1);
  });

  it("PF-006: buildDefaultChecklist は全項目を未確認で初期化する", () => {
    const cl = buildDefaultChecklist();
    expect(cl).toHaveLength(8);
    expect(cl.every((c) => c.items.length > 0)).toBe(true);
    expect(
      cl.flatMap((c) => c.items).every((i) => i.status === "unreviewed"),
    ).toBe(true);
  });

  it("normalizeMeetingRecord: 壊れた入力を既定化し machines を自動集計", () => {
    const norm = normalizeMeetingRecord({ contractors: [{ companyName: "A建設", machines: "クレーン" }] });
    expect(norm.contractors[0].companyName).toBe("A建設");
    expect(norm.machines.find((m) => m.name === "クレーン")?.count).toBe(1);
    expect(norm.checklist).toHaveLength(8);
  });

  it("normalizeMeetingRecord: null/未定義は完全な既定を返す", () => {
    const norm = normalizeMeetingRecord(null);
    expect(norm.contractors.length).toBeGreaterThan(0);
    expect(norm.checklist).toHaveLength(8);
  });

  it("normalizeMeetingRecord: 点検 status を key で引き継ぐ", () => {
    const def = buildDefaultMeetingRecord();
    const firstKey = def.checklist[0].items[0].key;
    def.checklist[0].items[0].status = "ok";
    const norm = normalizeMeetingRecord(JSON.parse(JSON.stringify(def)));
    expect(norm.checklist[0].items[0].status).toBe("ok");
    expect(norm.checklist[0].items[0].key).toBe(firstKey);
  });

  it("新規記録は未承認・未印刷のdocumentControlで始まる", () => {
    const rec = buildDefaultMeetingRecord();
    expect(rec.documentControl).toEqual({
      schemaVersion: 2,
      legacyImported: false,
      approval: null,
      lastPrint: null,
      history: [],
    });
  });

  it("旧形式の記録を承認済み・印刷済みと推定せず明示する", () => {
    const rec = normalizeMeetingRecord({
      id: "legacy",
      siteName: "旧現場",
      contractors: [
        {
          companyName: "旧会社",
          workContent: "旧作業",
          predictedDisasters: ["旧災害"],
          safetyInstructions: "旧指示",
        },
      ],
    });
    expect(rec.documentControl).toEqual({
      schemaVersion: 2,
      legacyImported: true,
      approval: null,
      lastPrint: null,
      history: [],
    });
  });

  it("壊れた承認・印刷状態をfail-closedで破棄する", () => {
    const rec = normalizeMeetingRecord({
      documentControl: {
        schemaVersion: 1,
        approval: {
          reviewerName: "",
          approvedAt: "not-a-date",
          contentRevision: "",
        },
        lastPrint: {
          printedAt: "not-a-date",
          contentRevision: "",
          approvalRevision: "",
        },
        history: [{ action: "approved", at: "invalid", contentRevision: "" }],
      },
    });
    expect(rec.documentControl.approval).toBeNull();
    expect(rec.documentControl.lastPrint).toBeNull();
    expect(rec.documentControl.history).toEqual([]);
  });
});
