import { describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "./route";

describe("/api/signage/pins — 端末内ピン境界", () => {
  it.each([
    ["GET", GET],
    ["POST", POST],
    ["DELETE", DELETE],
  ] as const)(
    "%s は410でサーバー保存・通知を停止する",
    async (_method, handler) => {
      const response = await handler();
      const body = (await response.json()) as {
        status: string;
        reasonCode: string;
        message: string;
      };

      expect(response.status).toBe(410);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("X-Data-Status")).toBe("local-only");
      expect(body.status).toBe("disabled");
      expect(body.reasonCode).toBe("LOCAL_ONLY_PINS");
      expect(body.message).toContain("メール通知は行いません");
    },
  );
});
