import { describe, expect, it } from "vitest";
import { buildAutomationServiceSchema } from "./automation-service-schema";

describe("automation Service JSON-LD", () => {
  it("omits a Web-form channel while only mail-client consultation is available", () => {
    const schema = buildAutomationServiceSchema({
      status: "mail_available",
      accepting: true,
      webFormEnabled: false,
      contactMode: "mail_client",
      intakeMode: null,
      retentionDays: null,
      label: "メール相談受付中",
      message: "メールアプリから送信します。",
    });
    const serialized = JSON.stringify(schema);
    expect(schema).not.toHaveProperty("availableChannel");
    expect(serialized).not.toContain("potentialAction");
    expect(serialized).not.toMatch(/@gmail|@outlook/i);
  });

  it("publishes a Web-form channel only when every provider gate is available", () => {
    const schema = buildAutomationServiceSchema({
      status: "available",
      accepting: true,
      webFormEnabled: true,
      contactMode: "web_form",
      intakeMode: "email",
      retentionDays: 30,
      label: "Webフォーム受付中",
      message: "受付中です。",
    });
    expect(schema).toHaveProperty(
      "availableChannel.serviceUrl",
      "https://www.anzen-ai-portal.jp/services/automation#consult-form",
    );
  });
});
