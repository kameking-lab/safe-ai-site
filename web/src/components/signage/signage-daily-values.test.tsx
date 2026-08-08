import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SignageDailyValues } from "./signage-daily-values";
import { DAILY_SLOGANS } from "@/lib/signage/daily-values";
import { setNoAccidentStartDate } from "@/lib/signage/no-accident-store";

const NOW = new Date(2026, 6, 3, 9, 0, 0);

afterEach(() => {
  window.localStorage.clear();
});

describe("SignageDailyValues", () => {
  it("起点日未設定では無災害日数を未設定と表示する", () => {
    render(<SignageDailyValues now={NOW} />);
    expect(screen.getByText("未設定")).toBeDefined();
  });

  it("保存済みの起点日から無災害日数を表示する", () => {
    setNoAccidentStartDate("2026-07-01");
    render(<SignageDailyValues now={NOW} />);
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

  it("気温・湿度がない場合もWBGTを推定せず実測確認を促す", () => {
    render(<SignageDailyValues now={NOW} />);
    expect(screen.getByText("実測計で確認")).toBeDefined();
    expect(screen.queryByText("気温・湿度からは自動推定しません")).toBeNull();
  });

  it("気温・湿度があってもWBGT値やリスクラベルを推定表示しない", () => {
    render(<SignageDailyValues now={NOW} currentTempC={33} currentHumidityPct={70} />);
    expect(screen.getByText("実測計で確認")).toBeDefined();
    expect(screen.queryByText("気温・湿度からは自動推定しません")).toBeNull();
    expect(screen.queryByText("℃", { exact: false })).toBeNull();
    expect(screen.queryByText(/安全|注意|警戒|厳重警戒|危険/)).toBeNull();
  });

  it("常掲値カードへ設定ボタンを重ねない", () => {
    render(<SignageDailyValues now={NOW} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
