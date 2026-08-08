import { describe, expect, it } from "vitest";
import {
  escapeAutomationConsultHtml,
  multilineAutomationConsultHtml,
  sanitizeAutomationConsultSourcePage,
} from "./html";

describe("automation consult HTML safety", () => {
  it("escapes HTML metacharacters before adding line breaks", () => {
    expect(escapeAutomationConsultHtml(`<script a="b">'&</script>`)).toBe(
      "&lt;script a=&quot;b&quot;&gt;&#39;&amp;&lt;/script&gt;"
    );
    expect(multilineAutomationConsultHtml("<b>line 1</b>\nline 2")).toBe(
      "&lt;b&gt;line 1&lt;/b&gt;<br>line 2"
    );
  });

  it("fails closed to the single approved source page", () => {
    expect(sanitizeAutomationConsultSourcePage("/services/automation")).toBe(
      "/services/automation"
    );
    expect(sanitizeAutomationConsultSourcePage("https://attacker.test/")).toBe(
      "/services/automation"
    );
  });
});
