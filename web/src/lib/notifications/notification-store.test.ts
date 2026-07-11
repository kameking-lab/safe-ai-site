import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  loadReadIds,
  markRead,
  saveNotificationSettings,
  saveReadIds,
} from "./notification-store";

describe("notification-store (端末内 既読・設定)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("既読IDの保存と読み出しが往復する", () => {
    markRead(["a", "b"]);
    expect(loadReadIds()).toEqual(new Set(["a", "b"]));
    markRead(["b", "c"]);
    expect(loadReadIds()).toEqual(new Set(["a", "b", "c"]));
  });

  it("既読IDは上限500件で古い順に間引かれる", () => {
    const many = Array.from({ length: 600 }, (_, i) => `id-${i}`);
    saveReadIds(new Set(many));
    const loaded = loadReadIds();
    expect(loaded.size).toBe(500);
    expect(loaded.has("id-0")).toBe(false); // 古い側が間引かれる
    expect(loaded.has("id-599")).toBe(true);
  });

  it("壊れたJSONでも既定値に落ちる（例外にしない）", () => {
    window.localStorage.setItem("safe-ai:notif-read:v1", "{oops");
    window.localStorage.setItem("safe-ai:notif-settings:v1", "[broken");
    expect(loadReadIds()).toEqual(new Set());
    expect(loadNotificationSettings()).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it("設定の保存と読み出し（未知フィールドは無視・型を矯正）", () => {
    saveNotificationSettings({ osNotify: true, prefectureIso: "JP-13" });
    expect(loadNotificationSettings()).toEqual({ osNotify: true, prefectureIso: "JP-13" });
    window.localStorage.setItem(
      "safe-ai:notif-settings:v1",
      JSON.stringify({ osNotify: "yes", prefectureIso: 13 }),
    );
    expect(loadNotificationSettings()).toEqual({ osNotify: false, prefectureIso: null });
  });
});
