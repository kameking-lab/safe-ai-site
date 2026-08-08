import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("/api/quiz-explain retired contract", () => {
  it("does not accept caller-supplied answers as trusted evidence", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(response.headers.get("X-AI-Used")).toBe("false");
    const body = (await response.json()) as {
      code: string;
      explanation: null;
      aiUsed: boolean;
    };
    expect(body.code).toBe("ROUTE_RETIRED");
    expect(body.explanation).toBeNull();
    expect(body.aiUsed).toBe(false);
  });
});
