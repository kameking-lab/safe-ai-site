import { describe, expect, it } from "vitest";
import { PREHYDRATION_INTERACTIONS_SCRIPT } from "./prehydration-interactions";

describe("prehydration interaction bootstrap", () => {
  it("records only interaction markers and keeps question text out of side channels", () => {
    expect(PREHYDRATION_INTERACTIONS_SCRIPT).toContain(
      "chatbotPrehydrationSubmit",
    );
    expect(PREHYDRATION_INTERACTIONS_SCRIPT).toContain("appShellHydrated");
    expect(PREHYDRATION_INTERACTIONS_SCRIPT).not.toContain(".value");
    expect(PREHYDRATION_INTERACTIONS_SCRIPT).not.toContain("localStorage");
    expect(PREHYDRATION_INTERACTIONS_SCRIPT).not.toContain("fetch(");
    expect(PREHYDRATION_INTERACTIONS_SCRIPT).not.toContain("sendBeacon");
    expect(PREHYDRATION_INTERACTIONS_SCRIPT).not.toContain("XMLHttpRequest");
  });
});
