import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { buildHomeAccidentPreview } from "@/lib/home/effect-first-data";
import { HomeLatestAccidents } from "./home-latest-accidents";

const live: HomeLatestAccidentNews = {
  status: "live",
  checkedAt: "2026-07-31T01:00:00.000Z",
  sourceLabel: "GoogleニュースRSS（各報道媒体の見出し）",
  sourceUrl: "https://news.google.com/",
  message:
    "公表日時順。報道見出しであり、行政・捜査機関による事故確定情報ではありません。",
  items: [
    {
      id: "report-1",
      publicId: "rpt-0123456789abcdef",
      contextAccidentType: "fall",
      contextWorkCategory: "construction",
      title: "工事現場で作業員が転落し死亡",
      href: "https://news.google.com/rss/articles/report-1",
      publishedAt: "2026-07-30T01:00:00.000Z",
      publisher: "確認媒体",
      industry: "建設業（見出し分類）",
      accidentType: "墜落・転落（見出し分類）",
      summary:
        "報道見出しの掲載です。発生経緯・原因・法的評価は一次発表で未確認です。",
      measure: "手すり・親綱・フルハーネスの確実な使用。",
      verification: "reported-unverified",
    },
  ],
};

describe("HomeLatestAccidents", () => {
  it("shows the official aggregate before current reported incidents and never marks them synthetic", () => {
    const { container } = render(<HomeLatestAccidents latestNews={live} />);
    const { featured } = buildHomeAccidentPreview();

    expect(screen.getByText(featured.period)).toBeTruthy();
    expect(
      screen.getByText(`${featured.deaths?.toLocaleString("ja-JP")}人`),
    ).toBeTruthy();
    expect(
      screen.getByText(`${featured.injuries?.toLocaleString("ja-JP")}人`),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "工事現場で作業員が転落し死亡" }),
    ).toBeTruthy();
    expect(container.textContent).toContain("報道・内容未確認");
    expect(container.textContent).toContain("見出し分類");
    expect(
      container.querySelectorAll('[data-accident-origin="reported-unverified"]'),
    ).toHaveLength(1);
    expect(
      container.querySelector('[data-accident-origin="synthetic"]'),
    ).toBeNull();
    const official = container.querySelector(
      '[data-accident-origin="official"]',
    );
    const reported = container.querySelector(
      '[data-accident-origin="reported-unverified"]',
    );
    expect(official).not.toBeNull();
    expect(reported).not.toBeNull();
    expect(
      official!.compareDocumentPosition(reported!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.textContent).not.toContain("詳細DBの直近収録事例");
  });

  it("keeps the official value and refuses to turn an RSS failure into no accidents", () => {
    const { featured } = buildHomeAccidentPreview();
    render(
      <HomeLatestAccidents
        latestNews={{
          ...live,
          status: "unavailable",
          items: [],
          message:
            "報道RSSを取得できませんでした。0件・事故なしとは判定しません。",
        }}
      />,
    );

    expect(
      screen.getByText(`${featured.deaths?.toLocaleString("ja-JP")}人`),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "取得不能を「事故なし」へ変換していません",
    );
  });
});
