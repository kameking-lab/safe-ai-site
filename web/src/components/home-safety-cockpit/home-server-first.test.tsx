import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EnvironmentWbgtStatus } from "@/lib/heat-illness/environment-wbgt";
import { HomeHeatSlideDeck, HomeHeatSnapshot } from "./home-heat-content";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const wbgt: EnvironmentWbgtStatus = {
  areaId: "tokyo-shinjuku",
  areaLabel: "東京都 新宿区",
  prefectureIso: "JP-13",
  scopeLabel: "東京都の観測点",
  wbgt: {
    status: "estimated",
    mode: "official-estimated-current",
    valueCelsius: 28.4,
    targetAt: "2026-08-02T03:00:00.000Z",
    createdAt: "2026-08-02T03:05:00.000Z",
    stationCount: 3,
    expectedStationCount: 3,
    stale: false,
    label: "環境省の観測値から算出",
  },
  alerts: {
    heatAlert: "active",
    specialHeatAlert: "inactive",
    targetDate: "2026-08-02",
    reportAt: "2026-08-02T02:00:00.000Z",
  },
  retrievedAt: "2026-08-02T03:06:00.000Z",
  degraded: false,
  provider: "環境省 熱中症予防情報サイト",
  sourceUrl: "https://www.wbgt.env.go.jp/",
  dataServiceUrl: "https://www.wbgt.env.go.jp/data_service.php",
};

describe("server-first home heat", () => {
  it("現在値・状態・次の行動をclient取得前に表示する", () => {
    const { container } = render(
      <HomeHeatSnapshot
        areaId="tokyo-shinjuku"
        areaLabel="東京都 新宿区"
        initialWbgt={wbgt}
        nationalSummary={null}
      />,
    );
    expect(screen.getByRole("heading", { name: "東京都 新宿区" })).toBeTruthy();
    expect(screen.getByText("28.4℃")).toBeTruthy();
    expect(screen.getByText("推定値")).toBeTruthy();
    expect(screen.getByText(/休憩を増やし/)).toBeTruthy();
    expect(container.querySelectorAll("[data-warning-card]")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "この暑さでKYを作る" })).toBeTruthy();
  });

  it("WBGTを取得できない時は暑さの値をKYへ引き継がない", () => {
    render(
      <HomeHeatSnapshot
        areaId="tokyo-shinjuku"
        areaLabel="東京都 新宿区"
        initialWbgt={null}
        nationalSummary={null}
      />,
    );
    expect(screen.getByText("取得できません", { selector: "span" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "この暑さでKYを作る" })).toBeNull();
  });

  it("スライド本文をserver HTMLに保ち、操作だけを小さな島へ分ける", () => {
    render(
      <HomeHeatSlideDeck
        slides={[
          { id: "one", eyebrow: "要点", title: "1枚目", lead: "本文1", fieldAction: "確認1" },
          { id: "two", eyebrow: "要点", title: "2枚目", lead: "本文2", fieldAction: "確認2" },
        ]}
      />,
    );
    expect(screen.getByText("本文1")).toBeTruthy();
    expect(screen.getByText("本文2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "次のスライド" }));
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(screen.getByText("本文2").closest("article")?.hidden).toBe(false);
  });
});
