import { describe, expect, it } from "vitest";
import {
  WORK_SCENARIOS,
  WORK_TAGS,
} from "./work-certification-mapper";
import {
  ALL_CERTS,
  QUARANTINED_CERTS,
} from "@/data/education-rules";

describe("業務シナリオの資格境界", () => {
  it("5t以上の一般クレーンで床上操作式を一般化せず、正しい号を示す", () => {
    const scenario = WORK_SCENARIOS.find(
      (item) => item.id === "ws-crane-large",
    );
    expect(scenario?.requiredCertIds).toEqual([
      "st-crane-5t",
      "lic-crane-derrick",
    ]);
    expect(scenario?.legalNote).toContain("安衛令第20条第6号");
    expect(scenario?.legalNote).toContain("免許が原則");
    expect(scenario?.legalNote).toContain("床上操作式");
    expect(scenario?.legalNote).toContain("床上運転式");
    expect(scenario?.legalNote).toContain("無線操作式");
    expect(scenario?.legalNote).not.toContain("第20条第7号");
  });

  it("シナリオ・タグから隔離レコードを参照しない", () => {
    const quarantinedIds = new Set(
      QUARANTINED_CERTS.map((cert) => cert.id),
    );
    const publicIds = new Set(ALL_CERTS.map((cert) => cert.id));
    const referencedIds = [
      ...WORK_SCENARIOS.flatMap((scenario) => scenario.requiredCertIds),
      ...WORK_TAGS.flatMap((tag) => tag.certIds),
    ];

    for (const id of referencedIds) {
      expect(quarantinedIds.has(id), `${id} は隔離参照不可`).toBe(false);
      expect(publicIds.has(id), `${id} は公開資格に存在`).toBe(true);
    }
  });
});
