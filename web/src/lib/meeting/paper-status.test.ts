import { describe, expect, it } from "vitest";
import { buildDefaultMeetingRecord, type MeetingRecord } from "@/lib/meeting/schema";
import { computeMeetingPaperStatus } from "./paper-status";

function blank(): MeetingRecord {
  return buildDefaultMeetingRecord();
}

function filled(): MeetingRecord {
  const rec = blank();
  rec.siteName = "○○ビル新築工事";
  rec.contractors[0] = {
    ...rec.contractors[0],
    companyName: "元請建設",
    workContent: "鉄骨建方",
    predictedDisasters: ["開口部からの墜落"],
    safetyInstructions: "親綱を使用し開口部養生を徹底",
  };
  return rec;
}

describe("computeMeetingPaperStatus（打合せ書の結論カード状態）", () => {
  it("空の打合せ書は『記入のこり4』で青（案内）・次は作業所名", () => {
    const s = computeMeetingPaperStatus(blank());
    expect(s.kind).toBe("incomplete");
    expect(s.tone).toBe("info");
    expect(s.remaining).toBe(4);
    expect(s.missing.map((m) => m.key)).toEqual([
      "site",
      "company",
      "disaster",
      "instruction",
    ]);
    expect(s.action).toEqual({ href: "#mtg-header", label: "作業所名を記入" });
  });

  it("作業所名のみ記入で残り3・次は協力会社・作業", () => {
    const rec = blank();
    rec.siteName = "△△現場";
    const s = computeMeetingPaperStatus(rec);
    expect(s.remaining).toBe(3);
    expect(s.missing.map((m) => m.key)).toEqual(["company", "disaster", "instruction"]);
    expect(s.action?.href).toBe("#mtg-companies");
    expect(s.action?.label).toBe("協力会社・作業を記入");
  });

  it("会社名だけで作業内容が空なら company はまだ未記入扱い", () => {
    const rec = blank();
    rec.siteName = "△△現場";
    rec.contractors[0] = { ...rec.contractors[0], companyName: "元請建設", workContent: "" };
    const s = computeMeetingPaperStatus(rec);
    expect(s.missing.map((m) => m.key)).toContain("company");
  });

  it("必須4項目が埋まり未保存なら青の『記入完了・未保存』→保存する", () => {
    const s = computeMeetingPaperStatus(filled());
    expect(s.kind).toBe("complete");
    expect(s.tone).toBe("info");
    expect(s.remaining).toBeUndefined();
    expect(s.missing).toEqual([]);
    expect(s.action).toEqual({ href: "#mtg-actions", label: "保存する" });
  });

  it("必須4項目が埋まり saved=false でも未保存（明示）として青", () => {
    const s = computeMeetingPaperStatus(filled(), { saved: false });
    expect(s.kind).toBe("complete");
    expect(s.tone).toBe("info");
    expect(s.title).toBe("記入完了・未保存");
  });

  it("必須4項目が埋まり saved=true なら緑の『保存済み』→保存一覧で確認", () => {
    const s = computeMeetingPaperStatus(filled(), { saved: true });
    expect(s.kind).toBe("saved");
    expect(s.tone).toBe("safe");
    expect(s.title).toBe("保存済み");
    expect(s.remaining).toBeUndefined();
    expect(s.missing).toEqual([]);
    expect(s.action).toEqual({ href: "/safety-diary/list", label: "保存一覧で確認" });
  });

  it("未完成なら saved=true でも保存済みにならない（記入のこりが優先）", () => {
    const s = computeMeetingPaperStatus(blank(), { saved: true });
    expect(s.kind).toBe("incomplete");
    expect(s.tone).toBe("info");
    expect(s.remaining).toBe(4);
  });

  it("予想災害が空白だけの配列は未記入扱い", () => {
    const rec = filled();
    rec.contractors[0] = { ...rec.contractors[0], predictedDisasters: ["", "  "] };
    const s = computeMeetingPaperStatus(rec);
    expect(s.kind).toBe("incomplete");
    expect(s.missing.map((m) => m.key)).toEqual(["disaster"]);
    expect(s.action?.label).toBe("予想災害を記入");
  });
});
