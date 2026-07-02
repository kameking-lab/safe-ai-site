import { afterEach, describe, expect, it } from "vitest";
import {
  getNoAccidentStartDate,
  resetNoAccidentStart,
  setNoAccidentStartDate,
} from "@/lib/signage/no-accident-store";

afterEach(() => {
  window.localStorage.clear();
});

describe("no-accident-store", () => {
  it("未設定なら null を返す", () => {
    expect(getNoAccidentStartDate()).toBeNull();
  });

  it("起点日を保存・読み戻しできる", () => {
    setNoAccidentStartDate("2026-01-01");
    expect(getNoAccidentStartDate()).toBe("2026-01-01");
  });

  it("不正な形式は無視する", () => {
    setNoAccidentStartDate("2026/01/01");
    expect(getNoAccidentStartDate()).toBeNull();
  });

  it("resetNoAccidentStart で起点日を上書きする", () => {
    setNoAccidentStartDate("2026-01-01");
    resetNoAccidentStart("2026-07-03");
    expect(getNoAccidentStartDate()).toBe("2026-07-03");
  });
});
