import { describe, expect, it } from "vitest";
import {
  AUTOMATION_MAIL_SUBJECT,
  AUTOMATION_MAIL_TEMPLATE,
  buildAutomationMailto,
  getAutomationMailRecipients,
} from "./mail-draft";

const ENV = {
  AUTOMATION_CONSULT_RECIPIENTS:
    "audit@outlook.com,primary@gmail.com",
};

describe("automation mail draft", () => {
  it("uses only Gmail and omits legacy Outlook from all mail parameters", () => {
    expect(getAutomationMailRecipients(ENV)).toEqual({
      to: "primary@gmail.com",
    });
    const mailto = buildAutomationMailto(ENV);
    expect(mailto).not.toBeNull();
    const [address, query] = mailto!.slice("mailto:".length).split("?");
    expect(decodeURIComponent(address)).toBe("primary@gmail.com");
    const params = new URLSearchParams(query);
    expect(params.has("bcc")).toBe(false);
    expect(mailto).not.toContain("outlook");
    expect(params.get("subject")).toBe(AUTOMATION_MAIL_SUBJECT);
    expect(params.get("body")).toBe(AUTOMATION_MAIL_TEMPLATE);
  });

  it("accepts a single Gmail without requiring an unverified secondary address", () => {
    expect(getAutomationMailRecipients({ AUTOMATION_CONSULT_RECIPIENTS: " Only@Gmail.com, " })).toEqual({ to: "only@gmail.com" });
  });

  it("uses only a fixed template and no user-supplied query or message", () => {
    const mailto = buildAutomationMailto({
      ...ENV,
      message: "must-not-be-used",
      query: "must-not-be-used",
    });
    expect(mailto).not.toContain("must-not-be-used");
    expect(decodeURIComponent(mailto ?? "")).toContain("【相談カテゴリ】");
  });

  it.each([
    "",
    "only@outlook.com",
    "one@gmail.com,two@gmail.com",
    "one@gmail.com,two@outlook.com\r\nBcc:bad@example.test",
  ])("fails closed for invalid or unsafe recipients (%s)", (recipients) => {
    expect(
      buildAutomationMailto({ AUTOMATION_CONSULT_RECIPIENTS: recipients }),
    ).toBeNull();
  });
});
