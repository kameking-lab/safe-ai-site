import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JapanPrefectureWarningMap } from "./japan-prefecture-warning-map";
import type { JmaMapLevel } from "@/lib/jma/parse-jma-warning";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("JapanPrefectureWarningMap fail-closed states", () => {
  it("取得中は空の地図を「発表なし」として描画しない", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<JapanPrefectureWarningMap levelsByIso={{}} status="loading" />);

    expect(screen.getByRole("status").textContent).toContain("警報の有無はまだ判定できません");
    expect(screen.queryByRole("img")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("部分取得でも確認済み地域を描画するため地図データを読み込み、警報なしとは断定しない", () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const incomplete: Record<string, JmaMapLevel> = Object.fromEntries(
      Array.from({ length: 46 }, (_, index) => [
        `JP-${String(index + 1).padStart(2, "0")}`,
        "none" as const,
      ]),
    );

    render(<JapanPrefectureWarningMap levelsByIso={incomplete} status="fresh" />);

    expect(screen.getByRole("status").textContent).toContain("警報の有無はまだ判定できません");
    expect(screen.queryByText(/発表はありません/)).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/geo/japan-prefectures-ne10m.json",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("stale 状態では以前の発表なしデータを再利用しない", () => {
    const levels: Record<string, JmaMapLevel> = Object.fromEntries(
      Array.from({ length: 47 }, (_, index) => [
        `JP-${String(index + 1).padStart(2, "0")}`,
        "none" as const,
      ]),
    );

    render(<JapanPrefectureWarningMap levelsByIso={levels} status="stale" />);

    expect(screen.getByRole("alert").textContent).toContain("古いため");
    expect(screen.queryByText(/発表はありません/)).toBeNull();
  });
});
