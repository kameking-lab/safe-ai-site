import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { HomeSafetyUpdates } from "./home-safety-updates";

const live: HomeLatestAccidentNews = {
  status: "live",
  checkedAt: "2026-07-31T01:00:00.000Z",
  sourceLabel: "GoogleニュースRSS（各報道媒体の見出し）",
  sourceUrl: "https://news.google.com/",
  message: "報道見出しです。",
  items: [
    {
      id: "raw-internal-1",
      publicId: "rpt-0123456789abcdef",
      contextAccidentType: "fall",
      contextWorkCategory: "construction",
      title: "工事現場で作業員が転落し死亡",
      href: "https://news.google.com/rss/articles/report-1",
      publishedAt: "2026-07-30T01:00:00.000Z",
      publisher: "確認媒体",
      industry: "建設業（見出し分類）",
      accidentType: "墜落・転落（見出し分類）",
      summary: "報道見出しの掲載です。原因・法的評価は未確認です。",
      measure: "開口部と墜落防止設備を現場で確認",
      verification: "reported-unverified",
    },
    {
      id: "raw-internal-2",
      publicId: "rpt-fedcba9876543210",
      contextAccidentType: "traffic",
      contextWorkCategory: "transport",
      title: "警備員が車両にはねられた事故",
      href: "https://news.google.com/rss/articles/report-2",
      publishedAt: "2026-07-29T01:00:00.000Z",
      publisher: "確認媒体2",
      industry: "運輸・交通関連（見出し分類）",
      accidentType: "交通事故・激突され（見出し分類）",
      summary: "報道見出しの掲載です。原因・法的評価は未確認です。",
      measure: "車両動線と誘導配置を現場で確認",
      verification: "reported-unverified",
    },
  ],
};

describe("HomeSafetyUpdates", () => {
  it("combines accident and law data and limits each stream to one featured plus two additions", () => {
    const { container } = render(<HomeSafetyUpdates latestNews={live} />);

    expect(screen.getByRole("heading", { name: "最新事故" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "注目法改正" })).toBeTruthy();
    expect(container.querySelectorAll("[data-accident-origin]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-law-source-state]")).toHaveLength(3);
    expect(container.textContent).toContain("追加2件を確認");
    expect(container.textContent).toContain("関連事故を見る");
    expect(container.textContent).toContain("施行 2026-08-01");
    expect(container.textContent).toContain("原文");
    expect(container.textContent).not.toContain("報道・内容未確認");
    expect(container.textContent).not.toContain("一次資料確認済み");
    expect(container.textContent).not.toContain("次の行動：");
  });

  it("does not import reported-unverified content or add a duplicate KY entry", () => {
    render(<HomeSafetyUpdates latestNews={live} />);
    expect(screen.queryByRole("link", { name: /KYを作る/ })).toBeNull();
    expect(screen.queryByText(/報道内容はKYへ引き継ぎません/)).toBeNull();
    expect(document.body.innerHTML).not.toContain(
      encodeURIComponent(live.items[0]!.title),
    );
    expect(document.body.innerHTML).not.toContain("raw-internal-1");
  });
});
