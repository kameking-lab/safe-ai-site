import { describe, it, expect } from "vitest";
import {
  getEnforcementStatus,
  daysUntilEnforcement,
  buildEnforcementBadge,
  normalizeEgovStatus,
} from "@/lib/law-revision-status";

const NOW = new Date(2026, 4, 28); // 2026-05-28

describe("P0-1 施行前/施行済 ステータス判定", () => {
  it("明示ステータス（e-Gov公式値）を最優先する", () => {
    expect(
      getEnforcementStatus({ enforcement_date: "2030-01-01", enforcement_status: "enforced" }, NOW),
    ).toBe("enforced");
  });

  it("過去の施行日は施行済", () => {
    expect(getEnforcementStatus({ enforcement_date: "2025-06-01" }, NOW)).toBe("enforced");
  });

  it("未来の施行日は施行前", () => {
    expect(getEnforcementStatus({ enforcement_date: "2027-04-01" }, NOW)).toBe("upcoming");
  });

  it("当日は施行済扱い", () => {
    expect(getEnforcementStatus({ enforcement_date: "2026-05-28" }, NOW)).toBe("enforced");
  });

  it("施行日不明は undetermined（推測しない）", () => {
    expect(getEnforcementStatus({ enforcement_date: "" }, NOW)).toBe("undetermined");
    expect(getEnforcementStatus({}, NOW)).toBe("undetermined");
  });

  it("残日数は施行前のみ正の整数、施行済/不明はnull", () => {
    expect(daysUntilEnforcement("2026-06-07", NOW)).toBe(10);
    expect(daysUntilEnforcement("2025-01-01", NOW)).toBeNull();
    expect(daysUntilEnforcement("", NOW)).toBeNull();
  });

  it("バッジ: 施行前はカウントダウン付きラベル", () => {
    const b = buildEnforcementBadge({ enforcement_date: "2026-06-07" }, NOW);
    expect(b.tone).toBe("upcoming");
    expect(b.label).toContain("あと10日");
    expect(b.daysLeft).toBe(10);
  });

  it("バッジ: 施行済/未定", () => {
    expect(buildEnforcementBadge({ enforcement_date: "2025-01-01" }, NOW).label).toBe("施行済");
    expect(buildEnforcementBadge({}, NOW).label).toBe("施行日未定");
  });

  it("e-Govステータス正規化", () => {
    expect(normalizeEgovStatus("CurrentEnforced")).toBe("enforced");
    expect(normalizeEgovStatus("UnEnforced")).toBe("upcoming");
    expect(normalizeEgovStatus("weird")).toBeNull();
    expect(normalizeEgovStatus(null)).toBeNull();
  });
});
