import { afterEach, describe, expect, it } from "vitest";
import {
  SIGNAGE_LANG_KEY,
  readStoredSignageLang,
  storeSignageLang,
} from "@/lib/signage/signage-prefs";

afterEach(() => {
  window.localStorage.clear();
});

describe("signage-prefs", () => {
  it("未設定なら ja を返す", () => {
    expect(readStoredSignageLang()).toBe("ja");
  });

  it("保存した言語を読み戻せる", () => {
    storeSignageLang("vi");
    expect(readStoredSignageLang()).toBe("vi");
    expect(window.localStorage.getItem(SIGNAGE_LANG_KEY)).toBe("vi");
  });

  it("無効な保存値は ja にフォールバック", () => {
    window.localStorage.setItem(SIGNAGE_LANG_KEY, "fr");
    expect(readStoredSignageLang()).toBe("ja");
  });
});
