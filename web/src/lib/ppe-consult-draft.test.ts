import { afterEach, describe, expect, it, vi } from "vitest";
import { __clearPpeConsultMemoryForTests, consumePpeConsultDraft, preparePpeConsultDraft } from "./ppe-consult-draft";

afterEach(() => { consumePpeConsultDraft(); sessionStorage.clear(); vi.restoreAllMocks(); });

describe("PPE consultation transfer", () => {
  it("carries the chosen task and actual unconfirmed checks once", () => {
    preparePpeConsultDraft(["fall", "scaffold", "anchor", "unknown", "result"]);
    const draft = consumePpeConsultDraft();
    expect(draft).toContain("足場・屋根・高所");
    expect(draft).toContain("未確認・相談したい点");
    expect(draft).toContain("体格");
    expect(consumePpeConsultDraft()).toBeNull();
  });

  it("rejects malformed choices and completed safe selections", () => {
    preparePpeConsultDraft(["fall", "not-a-task", "result"]);
    expect(consumePpeConsultDraft()).toBeNull();
    preparePpeConsultDraft(["fall", "scaffold", "anchor", ...Array(5).fill("confirmed")]);
    expect(consumePpeConsultDraft()).toBeNull();
  });

  it("survives a reload with only validated IDs, then deletes the same-tab slot", () => {
    preparePpeConsultDraft(["fall", "scaffold", "anchor", "unknown", "result"]);
    const key = sessionStorage.key(0)!;
    const raw = sessionStorage.getItem(key)!;
    expect(raw).toContain('"fall"');
    expect(raw).not.toContain("体格");
    __clearPpeConsultMemoryForTests();
    expect(consumePpeConsultDraft()).toContain("足場・屋根・高所");
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(consumePpeConsultDraft()).toBeNull();
  });

  it("drops expired or malformed slots and tolerates blocked storage", () => {
    vi.spyOn(Date, "now").mockReturnValue(100_000);
    preparePpeConsultDraft(["fall", "scaffold", "anchor", "unknown", "result"]);
    const key = sessionStorage.key(0)!;
    __clearPpeConsultMemoryForTests();
    vi.spyOn(Date, "now").mockReturnValue(300_001);
    expect(consumePpeConsultDraft()).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();

    sessionStorage.setItem(key, '{"expiresAt":300002,"answers":["fall","made-up","result"]}');
    expect(consumePpeConsultDraft()).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    preparePpeConsultDraft(["fall", "scaffold", "anchor", "unknown", "result"]);
    expect(consumePpeConsultDraft()).toContain("足場・屋根・高所");
  });
});
