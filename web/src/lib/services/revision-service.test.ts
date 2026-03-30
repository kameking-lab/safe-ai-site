import { describe, expect, it } from "vitest";
import { createMockRevisionService } from "@/lib/services/revision-service";

describe("revision-service", () => {
  it("法改正一覧を返す", async () => {
    const service = createMockRevisionService();
    const result = await service.getLawRevisions();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty("id");
      expect(result.data[0]).toHaveProperty("title");
    }
  });
});
