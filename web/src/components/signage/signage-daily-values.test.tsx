import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { SignageDailyValues } from "./signage-daily-values";
import { DAILY_SLOGANS } from "@/lib/signage/daily-values";

const NOW = new Date(2026, 6, 3, 9, 0, 0);

afterEach(() => {
  window.localStorage.clear();
});

describe("SignageDailyValues", () => {
  it("起点日未設定では無災害日数の代わりに設定ボタンを表示する", () => {
    render(<SignageDailyValues now={NOW} />);
    expect(screen.getByText("起点日を設定")).toBeDefined();
  });

  it("起点日を保存すると無災害日数が表示される", () => {
    render(<SignageDailyValues now={NOW} />);
    fireEvent.click(screen.getByText("起点日を設定"));
    fireEvent.change(screen.getByLabelText("無災害日数の起点日"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.click(screen.getByText("保存"));
    expect(screen.getByText("3")).toBeDefined();
  });

  it("今日の一言は DAILY_SLOGANS のいずれかを表示する", () => {
    render(<SignageDailyValues now={NOW} />);
    const found = DAILY_SLOGANS.some((s) => screen.queryByText(s));
    expect(found).toBe(true);
  });

  it("翌日には今日の一言の内容が変わる", () => {
    const { unmount } = render(<SignageDailyValues now={NOW} />);
    const day1 = DAILY_SLOGANS.find((s) => screen.queryByText(s));
    unmount();
    render(<SignageDailyValues now={new Date(2026, 6, 4, 9, 0, 0)} />);
    const day2 = DAILY_SLOGANS.find((s) => screen.queryByText(s));
    expect(day1).not.toBe(day2);
  });

  it("気温・湿度がない場合はWBGT取得中と表示する", () => {
    render(<SignageDailyValues now={NOW} />);
    expect(screen.getByText("湿度データ取得中…")).toBeDefined();
  });

  it("気温・湿度があればWBGT値とリスクラベルを表示する", () => {
    render(<SignageDailyValues now={NOW} currentTempC={33} currentHumidityPct={70} />);
    expect(screen.queryByText("湿度データ取得中…")).toBeNull();
    expect(screen.getByText("℃", { exact: false })).toBeDefined();
  });
});
