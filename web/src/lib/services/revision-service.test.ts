import { describe, expect, it } from "vitest";
import { createMockRevisionService } from "@/lib/services/revision-service";
import { lawRevisionCores } from "@/data/mock/law-revisions";

describe("revision-service", () => {
  it("法改正一覧を返す", async () => {
    expect(lawRevisionCores.length).toBeGreaterThan(0);
    const service = createMockRevisionService();
    const result = await service.getLawRevisions();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty("id");
      expect(result.data[0]).toHaveProperty("title");
      expect(result.data[0]).toHaveProperty("revisionNumber");
      expect(result.data[0]).toHaveProperty("kind");
      expect(result.data[0]).toHaveProperty("issuer");
      expect(result.data[0]).toHaveProperty("source");
    }
  });
});
