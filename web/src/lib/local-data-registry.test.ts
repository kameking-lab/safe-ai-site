import { beforeEach, describe, expect, it } from "vitest";
import { collectAppLocalStorageKeys, isAppLocalStorageKey } from "./local-data-registry";

beforeEach(() => localStorage.clear());

describe("local data registry", () => {
  it("covers sensitive current and legacy stores", () => {
    const appKeys = [
      "safe-ai:incident-report-list:v1",
      "safe-ai:heat-log-list:v1",
      "safe-ai:ky-workers:v1",
      "safe-ai:chemical-ra-records:v1",
      "safety-diary-v3",
      "anzen_chatbot_active_session_v1",
      "chatbot_history_v2",
      "meeting-record",
      "signage-floor-plan-image-v1",
      "company-profile-v1",
      "pwa-install-dismissed-at",
    ];
    for (const key of appKeys) localStorage.setItem(key, "synthetic");
    localStorage.setItem("unrelated-application-key", "preserve");

    expect(collectAppLocalStorageKeys(localStorage)).toEqual([...appKeys].sort());
    expect(isAppLocalStorageKey("unrelated-application-key")).toBe(false);
  });
});
