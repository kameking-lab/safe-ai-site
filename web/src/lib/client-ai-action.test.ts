import { describe, expect, it, vi } from "vitest";
import { runClientAiAction } from "@/lib/client-ai-action";

const HIGH_RISK_CLIENTS = [
  "legacy-law-chat-client",
  "ky-suggestion-client",
  "meeting-suggestion-client",
  "chemical-mixture-suggestion-client",
] as const;

describe("runClientAiAction", () => {
  it.each(HIGH_RISK_CLIENTS)(
    "%s invokes no network action for PII",
    async (purpose) => {
      const network = vi.fn(async () => new Response(null, { status: 200 }));
      const result = await runClientAiAction(
        {
          purpose,
          texts: ["担当者は山田太郎です"],
          consent: true,
          contextPolicy: "approved-server-corpus",
        },
        network,
      );
      expect(result.sent).toBe(false);
      expect(network).not.toHaveBeenCalled();
    },
  );

  it.each(HIGH_RISK_CLIENTS)(
    "%s invokes no network action for an emergency",
    async (purpose) => {
      const network = vi.fn(async () => new Response(null, { status: 200 }));
      const result = await runClientAiAction(
        {
          purpose,
          texts: ["作業員が倒れて意識がありません"],
          consent: true,
          contextPolicy: "approved-server-corpus",
        },
        network,
      );
      expect(result.sent).toBe(false);
      expect(network).not.toHaveBeenCalled();
    },
  );

  it("invokes the action once for an anonymous, consented input", async () => {
    const network = vi.fn(async () => "ok");
    const result = await runClientAiAction(
      {
        purpose: "test-safe-client",
        texts: ["脚立作業の注意点"],
        consent: true,
        contextPolicy: "approved-server-corpus",
      },
      network,
    );
    expect(result).toEqual({ sent: true, value: "ok" });
    expect(network).toHaveBeenCalledTimes(1);
  });
});
