import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("/api/translate/article retired contract", () => {
  it("does not translate caller-supplied safety text", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(response.headers.get("X-AI-Used")).toBe("false");
    const body = (await response.json()) as {
      source: string;
      text: null;
      aiUsed: boolean;
    };
    expect(body.source).toBe("withheld");
    expect(body.text).toBeNull();
    expect(body.aiUsed).toBe(false);
  });
});
